#!/usr/bin/env node
/**
 * Repair: guardian phone numbers stored in a form the portal can never match.
 *
 * `guardianPhones` is what portal sign-in matches against. The verified claim
 * Firebase returns is always `+91…`, normalised to `91` + ten digits before the
 * lookup — so a number stored in any other shape belongs to a guardian who is
 * told, correctly typed, that their number is not on record. Nothing reports
 * it: the query simply finds no children.
 *
 * Until the fix in lib/phone.ts, a number written with its domestic trunk zero
 * ("098765 43210" — eleven digits) was stored verbatim and did exactly that.
 * Every write path normalises correctly now, so records repair themselves as
 * they are next saved. This is for the ones written before that.
 *
 * Only rewrites an entry when the canonical form is UNAMBIGUOUS — a trunk zero
 * or a missing country code in front of a real ten-digit mobile. Anything else
 * (a short number, a foreign one, a typo of the wrong length) is reported and
 * left alone: guessing at what a wrong number was meant to be is how a family
 * ends up holding someone else's records.
 *
 * `guardians[].phone` keeps whatever the office typed. That field is what staff
 * read and dial; `guardianPhones` is the match key derived from it, and only
 * the key needs to be canonical.
 *
 * Usage:
 *   node scripts/fix-guardian-phones.mjs            # dry run, changes nothing
 *   node scripts/fix-guardian-phones.mjs --commit   # apply
 *
 * Credentials come from GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth
 * application-default login`, same as the app.
 */
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const COMMIT = process.argv.includes("--commit");
const PAGE = 200;

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
initializeApp({
  credential: raw ? cert(JSON.parse(raw)) : applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore();

/** The shape portal sign-in matches: 91 + a ten-digit mobile. */
const CANONICAL = /^91[6-9]\d{9}$/;

/**
 * The canonical key for a stored value, or null when it cannot be known.
 *
 * Mirrors normalizeIndianPhone in src/lib/phone.ts, then insists on a real
 * mobile. The stricter test is the point: this writes to the field that decides
 * who can read a child's record.
 */
function canonical(stored) {
  const digits = String(stored ?? "").replace(/\D/g, "");
  const local = digits.replace(/^0+/, "").replace(/^91/, "");
  return /^[6-9]\d{9}$/.test(local) ? `91${local}` : null;
}

async function* eachStudent() {
  let cursor = null;
  for (;;) {
    let q = db.collection("students").orderBy("__name__").limit(PAGE);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) return;
    for (const doc of snap.docs) yield doc;
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) return;
  }
}

/** Last four digits only. Enough to identify a row, not enough to be a contact list. */
const mask = (v) => `…${String(v).slice(-4)}`;

async function main() {
  const stats = { scanned: 0, alreadyFine: 0, repaired: 0, unrepairable: 0, noPhones: 0 };

  for await (const doc of eachStudent()) {
    stats.scanned++;
    const stored = doc.data().guardianPhones;
    const phones = Array.isArray(stored) ? stored : [];

    if (phones.length === 0) {
      stats.noPhones++;
      continue;
    }

    const fixed = [];
    let changed = false;

    for (const phone of phones) {
      if (CANONICAL.test(phone)) {
        fixed.push(phone);
        continue;
      }
      const repaired = canonical(phone);
      if (repaired) {
        console.log(`  ${doc.id}: ${mask(phone)} (${String(phone).length} digits) -> ${mask(repaired)}`);
        fixed.push(repaired);
        changed = true;
      } else {
        // Left as it is, and reported: an unmatchable number is still the only
        // record of how to reach this family, so it must not be deleted either.
        console.log(`  ${doc.id}: ${mask(phone)} cannot be repaired automatically — check by hand`);
        fixed.push(phone);
        stats.unrepairable++;
      }
    }

    if (!changed) {
      stats.alreadyFine++;
      continue;
    }

    stats.repaired++;
    // Deduplicate: repairing "09876543210" on a record that also holds
    // "919876543210" would otherwise leave the same guardian twice.
    if (COMMIT) await doc.ref.update({ guardianPhones: [...new Set(fixed)] });
  }

  console.log(
    `\n${COMMIT ? "Applied" : "Dry run"}: ${stats.scanned} students scanned, ` +
      `${stats.repaired} to repair, ${stats.unrepairable} need a human, ` +
      `${stats.alreadyFine} already correct, ${stats.noPhones} with no phone on file.`,
  );
  if (!COMMIT && stats.repaired > 0) console.log("Re-run with --commit to apply.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
