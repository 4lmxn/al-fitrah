import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { toStudent, COLLECTION as STUDENTS, type Student } from "@/lib/students";
import { listPayments, type Payment } from "@/lib/fees";
import { assertOwnStudent, type ParentSession } from "@/lib/parentAuth";

export type PortalChild = Pick<Student, "id" | "fullName" | "admissionNumber" | "program" | "classSection"> & {
  balancePaise: number;
};

export async function getStudentsForParent(session: ParentSession): Promise<PortalChild[]> {
  if (session.studentIds.length === 0) return [];
  const db = getDb();
  const docs = await db.getAll(...session.studentIds.map((id) => db.collection(STUDENTS).doc(id)));
  return docs
    .filter((d) => d.exists)
    .map(toStudent)
    .map((s) => ({
      id: s.id,
      fullName: s.fullName,
      admissionNumber: s.admissionNumber,
      program: s.program,
      classSection: s.classSection,
      balancePaise: s.fees.balancePaise,
    }));
}

export async function getOwnStudent(studentId: string): Promise<{ student: Student; payments: Payment[] } | null> {
  if (!(await assertOwnStudent(studentId))) return null;
  const doc = await getDb().collection(STUDENTS).doc(studentId).get();
  if (!doc.exists) return null;
  const snap = await getDb()
    .collection("payments")
    .where("studentId", "==", studentId)
    .orderBy("receivedAt", "desc")
    .limit(50)
    .get();
  const payments = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      receiptNumber: x.receiptNumber ?? "—",
      studentId,
      amountPaise: Number(x.amountPaise) || 0,
      method: x.method ?? "cash",
      reference: x.reference ?? null,
      note: x.note ?? null,
      receivedAtMs: x.receivedAt?.toMillis?.() ?? null,
      recordedBy: x.recordedBy ?? "—",
    } satisfies Payment;
  });
  return { student: toStudent(doc), payments };
}

export { listPayments };
