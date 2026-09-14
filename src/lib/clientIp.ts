import { createHash, timingSafeEqual } from "node:crypto";

const EDGE_HEADER = "x-edge-token";

function tokenMatches(presented: string, expected: string): boolean {
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

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
