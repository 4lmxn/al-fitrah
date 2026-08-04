// Lightweight in-memory rate limit.
//
// ⚠️ COUPLED TO `runConfig.maxInstances: 1` IN apphosting.yaml.
//
// The counter lives in this process's memory, so the limit is per instance, not
// per deployment. At one instance those are the same thing. Raise maxInstances
// to N and every limit silently becomes N times looser — no error, no log, just
// a form that takes more abuse than it looks like it does.
//
// Before raising instances, move this to Firestore: a `rateLimits/{key}`
// document with a TTL policy, incremented with FieldValue.increment. That costs
// a write per request on the limited routes, which is why it isn't the default
// while one instance is enough.
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
