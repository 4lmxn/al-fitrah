// Client IP for rate limiting. On Firebase App Hosting (Cloud Run behind
// Google's load balancer) the platform appends the real client IP as the
// LAST x-forwarded-for entry; earlier entries are client-supplied and
// spoofable, so never key limits off the leftmost value.
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (!xff) return "unknown";
  const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? "unknown";
}
