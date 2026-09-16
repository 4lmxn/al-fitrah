import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { phoneKey, judge, type DuplicateVerdict } from "@/lib/leadDedupe";

export async function findDuplicate(phone: string, excludeId?: string): Promise<DuplicateVerdict> {
  const key = phoneKey(phone);
  if (!key) return { duplicate: false };

  const snap = await getDb()
    .collection("leads")
    .where("phoneKey", "==", key)
    .orderBy("createdAt", "desc")
    .limit(2)
    .get();

  const match = snap.docs.find((d) => d.id !== excludeId);
  if (!match) return { duplicate: false };
  const x = match.data();
  return judge({
    id: match.id,
    name: x.parentName ?? x.name ?? "—",
    createdAtMs: x.createdAt?.toMillis?.() ?? null,
  });
}

export function leadDefaults(phone: string, verdict: DuplicateVerdict) {
  return {
    phoneKey: phoneKey(phone),
    noteCount: 0,
    ...(verdict.duplicate ? { possibleDuplicateOf: verdict.ofId } : {}),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}
