import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { getDb } from "@/lib/firebaseAdmin";
import { mergeSettings } from "./merge";
import { DEFAULT_SETTINGS, settingsSchema, type Settings } from "./schema";

export * from "./schema";
export { mergeSettings } from "./merge";

const COLLECTION = "settings";
const DOC = "platform";
const TAG = "settings";

/**
 * Platform settings, cached across requests.
 *
 * Configuration is read by nearly every page. Reading it per request would add
 * a Firestore read to every render and undo the work that took the inbox from
 * thousands of reads to roughly thirty. unstable_cache keeps one value per
 * revalidation window, shared by every request in the process, and the write
 * path invalidates the tag so an edit is live immediately rather than up to an
 * hour later.
 *
 * unstable_cache is deprecated in favour of the `use cache` directive, which
 * needs `cacheComponents: true` in next.config. That flag changes caching
 * semantics for every route in the app, which is too wide a blast radius to
 * introduce as a side effect of adding configuration. Recorded in
 * docs/ARCHITECTURE.md as its own migration.
 */
export const getSettings = unstable_cache(
  async (): Promise<Settings> => {
    try {
      const doc = await getDb().collection(COLLECTION).doc(DOC).get();
      return mergeSettings(doc.exists ? doc.data() : {});
    } catch (err) {
      // Firestore unreachable at render time must not blank the site.
      console.error("[settings] read failed; using defaults", err);
      return DEFAULT_SETTINGS;
    }
  },
  ["platform-settings"],
  { tags: [TAG], revalidate: 3600 },
);

/**
 * Persist a partial settings update.
 *
 * Validates the merged result, not the patch: a patch is meaningless alone, and
 * writing one that only makes sense against a stale base is how configuration
 * drifts into an invalid state.
 */
export async function saveSettings(patch: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  const doc = await db.collection(COLLECTION).doc(DOC).get();
  const merged = mergeSettings({ ...(doc.exists ? doc.data() : {}), ...(patch as object) });

  const parsed = settingsSchema.safeParse(merged);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }

  await db.collection(COLLECTION).doc(DOC).set(parsed.data);
  // Two-argument form: the single-argument call is deprecated in this Next
  // version. "max" gives stale-while-revalidate, so an edit is live on the next
  // request without a caller ever waiting on Firestore.
  revalidateTag(TAG, "max");
  return { ok: true };
}
