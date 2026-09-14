import { DEFAULT_SETTINGS, settingsSchema, type Settings } from "./schema";

export function mergeSettings(stored: unknown): Settings {
  const merged = deepMerge(DEFAULT_SETTINGS as unknown as Json, stored);
  const parsed = settingsSchema.safeParse(merged);
  if (parsed.success) return parsed.data;

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
    if (!(key in base)) continue;
    if (value === undefined || value === null) continue;
    const current = base[key];
    out[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
  }
  return out;
}
