import "server-only";
import { AggregateField } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

/**
 * Fees.
 *
 * Two pieces, and the split is the important part:
 *
 *   payments/{id}          an APPEND-ONLY ledger. Never updated, never deleted.
 *   students/{id}.fees     { totalPaise, paidPaise } — a cache of the ledger.
 *
 * The obvious design is a mutable "amount paid" field on the student that each
 * payment overwrites. That loses money: two staff recording payments at the
 * same moment both read 5000, both write 7000, and one parent's ₹2,000
 * disappears with no error and no trace. It is the one class of bug in this
 * system that cannot be reconstructed after the fact, because the evidence is
 * the thing that was overwritten.
 *
 * So payments are immutable rows and `paidPaise` is maintained with
 * FieldValue.increment — atomic server-side, so concurrent payments add rather
 * than clobber. `paidPaise` is a cache, not the truth: reconcile() recomputes it
 * from the ledger with a sum() aggregation, and the ledger always wins.
 *
 * A correction is a new negative-amount row (a refund or an adjustment), never
 * an edit. The ledger stays an accurate history of what actually happened.
 */

export const PAYMENTS = "payments";
export const STUDENTS = "students";

export type PaymentMethod = string;

export type Payment = {
  id: string;
  receiptNumber: string;
  studentId: string;
  amountPaise: number;
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
  receivedAtMs: number | null;
  recordedBy: string;
};

export type StudentFees = {
  totalPaise: number;
  paidPaise: number;
  /** Positive means the family still owes; negative means they overpaid. */
  balancePaise: number;
  /**
   * Collection state. A balance alone cannot tell an office who to ring today —
   * see lib/feeStatus.ts for why these three fields exist and how they rank.
   */
  dueDateMs: number | null;
  /** A date the parent named themselves. Silences the chase until it passes. */
  promisedDateMs: number | null;
  promiseNote: string | null;
  /** Stops two staff members messaging the same family the same morning. */
  lastRemindedMs: number | null;
  /**
   * Which price list this total came from, when it came from one. The amount is
   * copied rather than looked up (see lib/feeStructures), so this is provenance
   * — what to re-apply after a revision — not the source of the number.
   */
  structureId: string | null;
  structureName: string | null;
  /** Concession applied at assignment. Already subtracted from totalPaise. */
  discountPaise: number;
  discountReason: string | null;
};

const ms = (v: unknown): number | null =>
  (v as { toMillis?: () => number } | undefined)?.toMillis?.() ?? null;

export function feesOf(data: FirebaseFirestore.DocumentData | undefined): StudentFees {
  const totalPaise = Number(data?.fees?.totalPaise) || 0;
  const paidPaise = Number(data?.fees?.paidPaise) || 0;
  return {
    totalPaise,
    paidPaise,
    balancePaise: totalPaise - paidPaise,
    dueDateMs: ms(data?.fees?.dueDate),
    promisedDateMs: ms(data?.fees?.promisedDate),
    promiseNote: data?.fees?.promiseNote ?? null,
    lastRemindedMs: ms(data?.fees?.lastRemindedAt),
    structureId: data?.fees?.structureId ?? null,
    structureName: data?.fees?.structureName ?? null,
    discountPaise: Number(data?.fees?.discountPaise) || 0,
    discountReason: data?.fees?.discountReason ?? null,
  };
}

function toPayment(d: FirebaseFirestore.QueryDocumentSnapshot): Payment {
  const x = d.data();
  return {
    id: d.id,
    receiptNumber: x.receiptNumber ?? "—",
    studentId: x.studentId,
    amountPaise: Number(x.amountPaise) || 0,
    method: x.method ?? "cash",
    reference: x.reference ?? null,
    note: x.note ?? null,
    receivedAtMs: x.receivedAt?.toMillis?.() ?? null,
    recordedBy: x.recordedBy ?? "—",
  };
}

/**
 * A student's payment history, newest first.
 *
 * Bounded: a preschool child accrues a handful of payments a year, and a list
 * that grows without limit is the pattern this codebase keeps removing.
 */
export const PAYMENTS_PAGE_SIZE = 50;

export async function listPayments(studentId: string): Promise<Payment[]> {
  await requireAdmin();
  const snap = await getDb()
    .collection(PAYMENTS)
    .where("studentId", "==", studentId)
    .orderBy("receivedAt", "desc")
    .limit(PAYMENTS_PAGE_SIZE)
    .get();
  return snap.docs.map(toPayment);
}

/**
 * Recompute a student's paid total from the ledger.
 *
 * The reconciliation path for the cached `paidPaise`. sum() is an aggregation
 * query — one read per 1000 rows matched rather than one per row — so verifying
 * a student costs about as much as trusting them.
 *
 * Returns both figures so the caller can report a discrepancy rather than
 * silently overwriting; a mismatch means something wrote outside the intended
 * path, and that is worth knowing about, not quietly papering over.
 */
export async function reconcile(studentId: string): Promise<{ cachedPaise: number; ledgerPaise: number }> {
  await requireAdmin();
  const db = getDb();
  const [student, agg] = await Promise.all([
    db.collection(STUDENTS).doc(studentId).get(),
    db
      .collection(PAYMENTS)
      .where("studentId", "==", studentId)
      .aggregate({ total: AggregateField.sum("amountPaise") })
      .get(),
  ]);
  return {
    cachedPaise: feesOf(student.data()).paidPaise,
    ledgerPaise: Number(agg.data().total) || 0,
  };
}

/**
 * Next receipt number for a year, as `RCP-2026-0001`.
 *
 * Same shape and the same reasoning as admission numbers: zero-padded so string
 * ordering matches numeric ordering, and allocated inside a transaction because
 * two people taking money at the same counter must not be handed the same
 * receipt number.
 */
export function nextReceiptNumber(year: number, highest: string | null): string {
  const seq = highest ? Number(highest.split("-").pop()) : 0;
  const next = Number.isFinite(seq) ? seq + 1 : 1;
  return `RCP-${year}-${String(next).padStart(4, "0")}`;
}
