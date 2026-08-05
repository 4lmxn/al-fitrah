import { DEFAULT_SETTINGS, settingsSchema, type Settings } from "./schema";

/**
 * Overlay a stored settings document onto the code defaults.
 *
 * Deep merge for objects, but arrays REPLACE rather than concatenate. A school
 * that configures five class sections means exactly five — merging them into
 * the shipped six would resurrect a section they deliberately removed, and
 * attendance would keep offering a class that no longer exists.
 */
export function mergeSettings(stored: unknown): Settings {
  const merged = deepMerge(DEFAULT_SETTINGS as unknown as Json, stored);
  const parsed = settingsSchema.safeParse(merged);
  if (parsed.success) return parsed.data;

  // A malformed stored document must not take the platform down. Fall back to
  // defaults and say so loudly — silent degradation here would mean a school
  // editing settings and quietly getting someone else's configuration.
  console.error(
    "[settings] stored document failed validation; using defaults.",
    parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
  );
  return DEFAULT_SETTINGS;
}

type Json = Record<string, unknown>;

function isPlainObject(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge(base: Json, override: unknown): Json {
  if (!isPlainObject(override)) return base;
  const out: Json = { ...base };
  for (const [key, value] of Object.entries(override)) {
    // Ignore keys the schema doesn't know about rather than letting a stale
    // document reintroduce a setting that was removed.
    if (!(key in base)) continue;
    if (value === undefined || value === null) continue;
    const current = base[key];
    out[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
  }
  return out;
}
