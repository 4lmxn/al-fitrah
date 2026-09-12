// Client IP for rate limiting.
//
// Where the real address sits depends on what is in front of the app, and
// getting it wrong breaks rate limiting in one of two directions.
//
// Direct (Firebase App Hosting / Cloud Run behind Google's load balancer):
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
// ⚠️ SECURITY: CF-Connecting-IP is only trustworthy if the origin cannot be
// reached except through Cloudflare. If the origin is directly reachable, an
// attacker sets the header themselves, rotates it per request, and walks past
// every limit here. So trust is opt-in via TRUST_CLOUDFLARE_IP, and that flag
// must not be set until the origin is locked to Cloudflare — Authenticated
// Origin Pulls, or a firewall allowing only Cloudflare's published ranges.
// See docs/aws-cloudflare.md. Default is off, which is correct today.
const TRUST_CLOUDFLARE = process.env.TRUST_CLOUDFLARE_IP === "1";

export function getClientIp(req: Request): string {
  if (TRUST_CLOUDFLARE) {
    const cf = req.headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf;
  }
  const xff = req.headers.get("x-forwarded-for");
  if (!xff) return "unknown";
  const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? "unknown";
}
