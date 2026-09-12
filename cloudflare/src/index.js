/**
 * Edge proxy for the Al Fitrah app.
 *
 * Cloud Run in asia-south1 cannot serve a custom domain: domain mappings are
 * not offered in that region — verified, it returns
 * "Creating domain mappings is not allowed in asia-south1". The alternatives
 * were a Global External Load Balancer (~₹1,500/month, several times this
 * project's hosting budget) or moving compute out of Mumbai and back away from
 * Firestore, which is the thing the move existed to fix.
 *
 * So this Worker terminates the custom domain at Cloudflare's edge and forwards
 * to the run.app hostname with the Host header rewritten, which is what Cloud
 * Run routes on.
 *
 * It also carries the edge token. Putting it here rather than in a Transform
 * Rule means the secret lives in Wrangler's secret store instead of a rule's
 * value field, and it is overwritten on every request — a visitor who sends
 * their own x-edge-token cannot have it survive this hop.
 *
 * See docs/deploy-cloudrun-cloudflare.md §6 and src/lib/clientIp.ts.
 */

const ORIGIN = "al-fitrah-360754505866.asia-south1.run.app";
const CANONICAL_HOST = "www.alfitrahsarjapura.in";

/**
 * Paths that must never be cached at the edge: authenticated, per-user, or
 * side-effecting.
 *
 * Getting this wrong is not a performance bug — a cached /admin page would
 * serve one member of staff's session-rendered view to the next visitor.
 */
const NEVER_CACHE = [/^\/admin(\/|$)/, /^\/portal(\/|$)/, /^\/api(\/|$)/];

/** How long the edge keeps a copy, by content type. */
const TTL_STATIC = 31536000; // /_next/static is content-hashed and immutable
const TTL_PAGE = 3600; // matches the app's own revalidation window

/**
 * Why caching is done by hand rather than with `cf: { cacheEverything: true }`.
 *
 * Two things defeat the automatic path, and both were observed live — every
 * response came back `cf-cache-status: MISS`, static assets included:
 *
 * 1. Next's App Router sends
 *      Vary: rsc, next-router-state-tree, next-router-prefetch, ...
 *    on every response. Cloudflare only understands `Vary: Accept-Encoding`;
 *    anything else makes the response uncacheable to it.
 *
 * 2. The origin is `run.app`, outside this zone, where the `cf` fetch options
 *    are not dependable.
 *
 * The Cache API sidesteps both: we choose the key, and we store a copy with the
 * Vary header normalised.
 *
 * ⚠️ The Vary above is not noise — the same URL genuinely returns different
 * bodies for an RSC navigation than for a full page load. Stripping the header
 * and caching one body under a key the other also matches would serve React
 * payloads to browsers asking for HTML. So RSC requests bypass the cache
 * entirely rather than being cached under a shared key. They are client-side
 * navigations, already fast, and a small share of traffic.
 */
function isRscRequest(request) {
  return request.headers.has("rsc") || request.headers.has("next-router-prefetch");
}

const worker = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Apex to www, permanently. The app's canonical URLs, sitemap and JSON-LD
    // all use the www form; serving both would split them.
    if (url.hostname !== CANONICAL_HOST && url.hostname.endsWith("alfitrahsarjapura.in")) {
      url.hostname = CANONICAL_HOST;
      return Response.redirect(url.toString(), 301);
    }

    const originUrl = new URL(url);
    originUrl.hostname = ORIGIN;
    originUrl.protocol = "https:";
    originUrl.port = "";

    const originRequest = new Request(originUrl, request);
    originRequest.headers.set("host", ORIGIN);

    // The visitor's real address. The app keys rate limits off this, but only
    // once the token below proves the request came through this Worker.
    const visitorIp = request.headers.get("cf-connecting-ip");
    if (visitorIp) originRequest.headers.set("cf-connecting-ip", visitorIp);

    // Always set or clear — never pass a client-supplied value through.
    if (env.EDGE_TOKEN) originRequest.headers.set("x-edge-token", env.EDGE_TOKEN);
    else originRequest.headers.delete("x-edge-token");

    const cacheable =
      request.method === "GET" &&
      !isRscRequest(request) &&
      !NEVER_CACHE.some((re) => re.test(url.pathname));

    if (!cacheable) return fetch(originRequest);

    const cache = caches.default;
    // Key on the visitor-facing URL, so a cached entry is not tied to the
    // origin hostname and survives the origin being renamed.
    const cacheKey = new Request(url.toString(), { method: "GET" });

    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const response = await fetch(originRequest);

    // A response that sets a cookie is per-visitor by definition, whatever the
    // path said. Never store one.
    if (!response.ok || response.headers.has("set-cookie")) return response;

    const ttl = url.pathname.startsWith("/_next/static/") ? TTL_STATIC : TTL_PAGE;

    const toStore = new Response(response.clone().body, response);
    // Normalised so Cloudflare will store it at all — safe only because RSC
    // requests never reach this branch.
    toStore.headers.set("vary", "Accept-Encoding");
    toStore.headers.set("cache-control", `public, max-age=${ttl}`);

    ctx.waitUntil(cache.put(cacheKey, toStore.clone()));
    return toStore;
  },
};

export default worker;
