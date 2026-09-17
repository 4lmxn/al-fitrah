#!/usr/bin/env node
/**
 * Backfill: monthly attendance rollups for registers saved before they existed.
 *
 * `attendanceRollups/{year}_{class}_{month}` is written in the same batch as the
 * register from Sep 2026 onward, so every register saved after that keeps its
 * rollup current. Registers saved before it have no rollup, and the trend view
 * reads rollups only — by design, because reading the days themselves is the
 * ~1,320-reads-per-view cost the rollup exists to avoid. Without this, those
 * months render as "Not marked", which is a lie about attendance that was taken.
 *
 * Safe to re-run: each day is written at its own key under `days`, so a second
 * pass rewrites the same numbers rather than adding to them. That is also why
 * the live path can overwrite a corrected register without double counting.
 *
 * Counts are stored under the status ids the register actually used, not under
 * present/absent. Whether "late" counts as present is a settings decision that
 * can change later, and a rollup that baked it in would make the history wrong
 * the day the school changed its mind.
 *
 * Usage:
 *   node scripts/backfill-attendance-rollups.mjs            # dry run
 *   node scripts/backfill-attendance-rollups.mjs --commit   # apply
 *
 * Credentials come from GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth
 * application-default login`, same as the app.
 */
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const COMMIT = process.argv.includes("--commit");
const PAGE = 300;

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
initializeApp({
  credential: raw ? cert(JSON.parse(raw)) : applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore();

async function* eachRegister() {
  let cursor = null;
  for (;;) {
    let q = db.collection("attendance").orderBy("__name__").limit(PAGE);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) return;
    for (const doc of snap.docs) yield doc;
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) return;
  }
}

async function main() {
  /** rollup id -> { academicYear, classSection, month, days } */
  const rollups = new Map();
  const stats = { registers: 0, skipped: 0 };

  for await (const doc of eachRegister()) {
    const x = doc.data();
    const { academicYear, classSection, dateKey, entries } = x;

    if (!academicYear || !classSection || !dateKey || !entries) {
      // A register missing its own coordinates cannot be filed under a month.
      console.log(`  ${doc.id}: incomplete register, left alone`);
      stats.skipped++;
      continue;
    }

    stats.registers++;
    const month = String(dateKey).slice(0, 7);
    const id = `${academicYear}_${classSection}_${month}`;
    const rollup =
      rollups.get(id) ?? { academicYear, classSection, month, days: {} };

    const counts = {};
    for (const status of Object.values(entries)) {
      counts[status] = (counts[status] ?? 0) + 1;
    }
    rollup.days[dateKey] = counts;
    rollups.set(id, rollup);
  }

  for (const [id, rollup] of rollups) {
    const days = Object.keys(rollup.days).length;
    console.log(`  ${id}: ${days} ${days === 1 ? "day" : "days"}`);
    // merge:true so a month already half-written by the live path keeps the
    // days this pass did not see.
    if (COMMIT) await db.collection("attendanceRollups").doc(id).set(rollup, { merge: true });
  }

  console.log(
    `\n${COMMIT ? "Applied" : "Dry run"}: ${stats.registers} registers read, ` +
      `${rollups.size} rollups to write, ${stats.skipped} skipped.`,
  );
  if (!COMMIT && rollups.size > 0) console.log("Re-run with --commit to apply.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
