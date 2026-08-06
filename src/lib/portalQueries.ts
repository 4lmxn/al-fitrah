import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { toStudent, COLLECTION as STUDENTS, type Student } from "@/lib/students";
import { listPayments, type Payment } from "@/lib/fees";
import { assertOwnStudent, type ParentSession } from "@/lib/parentAuth";

/**
 * Reads for the parent portal.
 *
 * Every function here takes the resolved session — never a student id from the
 * request on its own. The rule from lib/parentAuth applies at the data layer as
 * well as the page, because a page is one caller and the data layer is the last
 * place a mistake can still be caught.
 */

export type PortalChild = Pick<Student, "id" | "fullName" | "admissionNumber" | "program" | "classSection"> & {
  balancePaise: number;
};

/** The signed-in parent's children. Ids come from the session, not the URL. */
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

/**
 * One child, only if the signed-in parent is a guardian of them.
 *
 * Returns null rather than throwing on a mismatch, and the page renders a
 * not-found — a parent probing ids should not be able to learn which exist.
 */
export async function getOwnStudent(studentId: string): Promise<{ student: Student; payments: Payment[] } | null> {
  if (!(await assertOwnStudent(studentId))) return null;
  const doc = await getDb().collection(STUDENTS).doc(studentId).get();
  if (!doc.exists) return null;
  // listPayments enforces admin auth, so the parent path queries directly —
  // authorisation for this read was already established above.
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
