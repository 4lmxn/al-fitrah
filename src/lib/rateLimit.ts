// Lightweight in-memory rate limit (per instance). Good enough for a
// low-traffic marketing site; swap for Firestore/Redis if traffic grows.
const HITS = new Map<string, { count: number; ts: number }>();
const MAX_ENTRIES = 10_000;

export function rateLimited(
  key: string,
  opts: { windowMs?: number; max?: number } = {},
): boolean {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 5;
  const now = Date.now();
  // Evict expired entries once the map grows large so a flood of unique
  // keys can't grow memory unbounded on a long-lived instance.
  if (HITS.size >= MAX_ENTRIES) {
    for (const [k, v] of HITS) {
      if (now - v.ts > windowMs) HITS.delete(k);
    }
  }
  const rec = HITS.get(key);
  if (!rec || now - rec.ts > windowMs) {
    HITS.set(key, { count: 1, ts: now });
    return false;
  }
  rec.count += 1;
  return rec.count > max;
}
