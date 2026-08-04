#!/usr/bin/env node
/**
 * Backfill: lead `notes` array  ->  `leads/{id}/notes/{noteId}` subcollection.
 *
 * Deliberately ADDITIVE. The first pass only writes: it creates subcollection
 * documents and sets `noteCount`, and never touches the legacy array. That is
 * what makes it safe to run without a restore plan — if it goes wrong halfway,
 * the original data is still exactly where it was, and the app reads the array
 * as a fallback whenever the subcollection is empty (see src/lib/notes.ts).
 *
 * Dropping the arrays is a separate, opt-in second pass, run only after you
 * have eyeballed a few leads in the console.
 *
 * Idempotent: a lead whose subcollection already holds every note it had in the
 * array is skipped, so re-running after an interruption is safe and cheap.
 *
 * Usage:
 *   node scripts/migrate-notes.mjs                 # dry run, changes nothing
 *   node scripts/migrate-notes.mjs --commit        # pass 1: backfill
 *   node scripts/migrate-notes.mjs --drop-arrays   # pass 2: dry run of cleanup
 *   node scripts/migrate-notes.mjs --drop-arrays --commit
 *
 * Credentials come from GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth
 * application-default login`, same as the app.
 */
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const COMMIT = process.argv.includes("--commit");
const DROP_ARRAYS = process.argv.includes("--drop-arrays");
const PAGE = 200;

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
initializeApp({
  credential: raw ? cert(JSON.parse(raw)) : applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore();

const legacyNotes = (data) => (Array.isArray(data.notes) ? data.notes : []);

/** Page through every lead by document id — no index, no full in-memory load. */
async function* eachLead() {
  let cursor = null;
  for (;;) {
    let q = db.collection("leads").orderBy("__name__").limit(PAGE);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) return;
    for (const doc of snap.docs) yield doc;
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) return;
  }
}

async function backfill() {
  const stats = { scanned: 0, migrated: 0, notesWritten: 0, skipped: 0, zeroed: 0 };

  for await (const doc of eachLead()) {
    stats.scanned++;
    const data = doc.data();
    const notes = legacyNotes(data);

    if (notes.length === 0) {
      // Nothing to move. Still needs noteCount so list views and the
      // "untouched new lead" rule don't fall back to counting a missing array.
      if (typeof data.noteCount !== "number") {
        stats.zeroed++;
        if (COMMIT) await doc.ref.update({ noteCount: 0 });
      }
      continue;
    }

    // Idempotency: if the subcollection already holds at least as many entries
    // as the array, this lead was done on an earlier run.
    const existing = await doc.ref.collection("notes").count().get();
    if (existing.data().count >= notes.length) {
      stats.skipped++;
      continue;
    }

    if (COMMIT) {
      const batch = db.batch();
      for (const n of notes) {
        batch.set(doc.ref.collection("notes").doc(), {
          text: n.text ?? "",
          author: n.author ?? "—",
          kind: n.kind === "stage" ? "stage" : "note",
          // Preserve the original timestamp — this is real history. Fall back to
          // the lead's creation time rather than stamping "now", which would
          // reorder the timeline.
          at: n.at ?? data.createdAt ?? FieldValue.serverTimestamp(),
        });
      }
      batch.update(doc.ref, { noteCount: notes.length });
      await batch.commit();
    }

    stats.migrated++;
    stats.notesWritten += notes.length;
  }

  return stats;
}

async function dropArrays() {
  const stats = { scanned: 0, dropped: 0, notReady: 0 };

  for await (const doc of eachLead()) {
    stats.scanned++;
    const data = doc.data();
    const notes = legacyNotes(data);
    if (notes.length === 0) continue;

    // Only drop once the subcollection provably holds everything the array did.
    const existing = await doc.ref.collection("notes").count().get();
    if (existing.data().count < notes.length) {
      stats.notReady++;
      console.warn(
        `  ! ${doc.id}: subcollection has ${existing.data().count} of ${notes.length} notes — leaving the array alone`,
      );
      continue;
    }

    stats.dropped++;
    if (COMMIT) await doc.ref.update({ notes: FieldValue.delete() });
  }

  return stats;
}

const mode = DROP_ARRAYS ? "drop legacy arrays" : "backfill subcollection";
console.log(`\nmigrate-notes — ${mode} — ${COMMIT ? "COMMIT" : "DRY RUN (nothing will be written)"}\n`);

const stats = DROP_ARRAYS ? await dropArrays() : await backfill();

console.log("\nResult:", stats);
if (!COMMIT) console.log("\nDry run only. Re-run with --commit to apply.\n");
else if (!DROP_ARRAYS) {
  console.log(
    "\nBackfill done. The legacy arrays are untouched and still act as a fallback.\n" +
      "Spot-check a few leads in the console, then run with --drop-arrays --commit.\n",
  );
}
process.exit(0);
