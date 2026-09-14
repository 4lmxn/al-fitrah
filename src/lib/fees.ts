import "server-only";
import { AggregateField } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

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
  balancePaise: number;
  dueDateMs: number | null;
  promisedDateMs: number | null;
  promiseNote: string | null;
  lastRemindedMs: number | null;
  structureId: string | null;
  structureName: string | null;
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

export function nextReceiptNumber(year: number, highest: string | null): string {
  const seq = highest ? Number(highest.split("-").pop()) : 0;
  const next = Number.isFinite(seq) ? seq + 1 : 1;
  return `RCP-${year}-${String(next).padStart(4, "0")}`;
}
