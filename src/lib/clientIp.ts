import { createHash, timingSafeEqual } from "node:crypto";

// Client IP for rate limiting.
//
// Where the real address sits depends on what is in front of the app, and
// getting it wrong breaks rate limiting in one of two directions.
//
// Direct (Cloud Run, App Hosting, anything behind Google's load balancer):
//   the platform appends the real client IP as the LAST x-forwarded-for entry.
//   Earlier entries are client-supplied and spoofable, so never key limits off
//   the leftmost value.
//
// Behind Cloudflare:
//   the last x-forwarded-for entry becomes the Cloudflare edge that connected
//   to the origin, not the visitor. Every visitor then collapses onto a handful
//   of edge addresses and shares one counter — one abusive client locks out the
//   whole school, and per-visitor limits stop meaning anything. Cloudflare sets
//   the real address in CF-Connecting-IP and overwrites any value the client
//   supplied, so that is the header to read.
//
// ── Why this is a token and not a boolean ───────────────────────────────────
//
// This used to be a TRUST_CLOUDFLARE_IP flag, and the flag was wrong in BOTH
// positions for as long as the origin stayed directly reachable:
//
//   "1"  CF-Connecting-IP becomes attacker-settable. Anyone hitting the origin
//        directly sets it themselves, rotates it per request, and walks past
//        every limit on sign-in, enquiry, application and capture.
//
//   "0"  Behind Cloudflare, every visitor shares the edge's address. The first
//        person to submit the enquiry form five times trips the limit for
//        EVERYONE. A self-inflicted outage with no attacker involved.
//
// The flag only became safe once the origin could not be reached except through
// Cloudflare — and on Cloud Run that means a Global External Load Balancer with
// Cloud Armor, which costs several times this project's entire hosting budget.
//
// So trust is proved per request instead of configured per deployment.
// Cloudflare attaches a shared secret to every request it forwards (a Transform
// Rule on the zone). A request carrying the right token demonstrably came
// through our zone, so its CF-Connecting-IP is Cloudflare's and trustworthy.
// A request arriving straight at the origin cannot produce the token, so its
// CF-Connecting-IP is ignored and it falls back to x-forwarded-for.
//
// Both failure modes close at once, and there is no window during cutover where
// some setting is temporarily wrong: before Cloudflare exists, EDGE_TOKEN is
// unset and nothing trusts the header; after, only edge traffic does.
//
// ⚠️ This is an application-layer check. The request still reaches the app
// before being judged, which is fine at this scale but is NOT the same as a
// network-level origin lock. If the origin ever needs to be unreachable rather
// than merely untrusted, that is the load balancer, and it costs money.
// See docs/deploy-cloudrun-cloudflare.md.
const EDGE_HEADER = "x-edge-token";

/** Constant-time compare, hashed to a fixed length so lengths can't leak. */
function tokenMatches(presented: string, expected: string): boolean {
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** True when this request demonstrably arrived through our Cloudflare zone. */
export function isFromEdge(req: Request): boolean {
  const expected = process.env.EDGE_TOKEN;
  if (!expected) return false;
  const presented = req.headers.get(EDGE_HEADER)?.trim();
  if (!presented) return false;
  return tokenMatches(presented, expected);
}

export function getClientIp(req: Request): string {
  if (isFromEdge(req)) {
    const cf = req.headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf;
  }
  const xff = req.headers.get("x-forwarded-for");
  if (!xff) return "unknown";
  const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? "unknown";
}
