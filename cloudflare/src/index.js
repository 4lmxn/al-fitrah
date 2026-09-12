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
 * side-effecting. Everything else is prerendered marketing content that the
 * app already serves with its own revalidation window.
 *
 * Getting this wrong is not a performance bug — a cached /admin page would
 * serve one member of staff's session-rendered view to the next visitor.
 */
const NEVER_CACHE = [/^\/admin(\/|$)/, /^\/portal(\/|$)/, /^\/api(\/|$)/];

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Apex to www, permanently. The app's canonical URLs, sitemap and JSON-LD
    // all use the www form; serving both would split them.
    if (url.hostname !== CANONICAL_HOST && url.hostname.endsWith("alfitrahsarjapura.in")) {
      url.hostname = CANONICAL_HOST;
      return Response.redirect(url.toString(), 301);
    }

    const uncacheable = NEVER_CACHE.some((re) => re.test(url.pathname));

    const originUrl = new URL(url);
    originUrl.hostname = ORIGIN;
    originUrl.protocol = "https:";
    originUrl.port = "";

    const req = new Request(originUrl, request);
    req.headers.set("host", ORIGIN);

    // The visitor's real address. The app keys rate limits off this, but only
    // once the token below proves the request came through this Worker.
    const visitorIp = request.headers.get("cf-connecting-ip");
    if (visitorIp) req.headers.set("cf-connecting-ip", visitorIp);

    // Always set or clear — never pass a client-supplied value through.
    if (env.EDGE_TOKEN) req.headers.set("x-edge-token", env.EDGE_TOKEN);
    else req.headers.delete("x-edge-token");

    return fetch(req, {
      cf: uncacheable
        ? { cacheEverything: false }
        : {
            cacheEverything: true,
            // Errors are cached briefly or not at all, so a bad deploy does not
            // pin a 500 at the edge for an hour.
            cacheTtlByStatus: { "200-299": 3600, "300-399": 600, "400-499": 30, "500-599": 0 },
          },
    });
  },
};

export default worker;
