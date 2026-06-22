// Lightweight in-memory rate limit (per instance). Good enough for a
// low-traffic marketing site; swap for Firestore/Redis if traffic grows.
const HITS = new Map<string, { count: number; ts: number }>();

export function rateLimited(
  key: string,
  opts: { windowMs?: number; max?: number } = {},
): boolean {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 5;
  const now = Date.now();
  const rec = HITS.get(key);
  if (!rec || now - rec.ts > windowMs) {
    HITS.set(key, { count: 1, ts: now });
    return false;
  }
  rec.count += 1;
  return rec.count > max;
}
