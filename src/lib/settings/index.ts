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

export const getSettings = unstable_cache(
  async (): Promise<Settings> => {
    try {
      const doc = await getDb().collection(COLLECTION).doc(DOC).get();
      return mergeSettings(doc.exists ? doc.data() : {});
    } catch (err) {
      console.error("[settings] read failed; using defaults", err);
      return DEFAULT_SETTINGS;
    }
  },
  ["platform-settings"],
  { tags: [TAG], revalidate: 3600 },
);

export async function saveSettings(patch: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  const doc = await db.collection(COLLECTION).doc(DOC).get();
  const merged = mergeSettings({ ...(doc.exists ? doc.data() : {}), ...(patch as object) });

  const parsed = settingsSchema.safeParse(merged);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }

  await db.collection(COLLECTION).doc(DOC).set(parsed.data);
  revalidateTag(TAG, "max");
  return { ok: true };
}
