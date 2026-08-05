import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { phoneKey, judge, type DuplicateVerdict } from "@/lib/leadDedupe";

/**
 * Shared write-path helpers for leads.
 *
 * The four entry points (website form, capture, staff-entered, staff
 * application) had drifted into four slightly different shapes. Anything that
 * must be true of every lead belongs here rather than being copied a fourth
 * time and then a fifth.
 */

/**
 * Find a recent lead with the same phone number.
 *
 * One indexed read per submission. Submissions are low volume, and the
 * alternative — staff discovering the duplicate weeks later by calling the same
 * parent twice — is not cheaper, just invisible.
 */
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

/**
 * Fields every lead must carry, whichever door it came in through.
 *
 * `phoneKey` is what makes duplicate detection possible at all — without it
 * stored at write time, finding matches means scanning and normalising the
 * whole collection on every submission.
 */
export function leadDefaults(phone: string, verdict: DuplicateVerdict) {
  return {
    phoneKey: phoneKey(phone),
    // Explicit zero: the untouched-leads query filters on noteCount == 0, and a
    // document missing the field is not in that index at all.
    noteCount: 0,
    // Unassigned until someone picks it up. Explicit null so the "unassigned"
    // filter is an equality match rather than a missing-field scan.
    assignedTo: null,
    ...(verdict.duplicate ? { possibleDuplicateOf: verdict.ofId } : {}),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}
