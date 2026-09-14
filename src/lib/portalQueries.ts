import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { toStudent, COLLECTION as STUDENTS, type Student } from "@/lib/students";
import { listPayments, type Payment } from "@/lib/fees";
import { assertOwnStudent, type ParentSession } from "@/lib/parentAuth";
import {
  COLLECTION as ATTENDANCE,
  dateKey,
  monthBounds,
  summarise,
  type Register,
  type StudentAttendance,
} from "@/lib/attendance";
import { getAttendanceStatuses } from "@/lib/taxonomy";

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

export type PortalAttendanceDay = { dateKey: string; status: string; present: boolean };

export type PortalAttendance = {
  monthKey: string;
  summary: StudentAttendance;
  days: PortalAttendanceDay[];
};

export function ownDays(
  registers: Register[],
  studentId: string,
  statuses: { id: string; present: boolean; counted: boolean }[],
): PortalAttendanceDay[] {
  const present = new Set(statuses.filter((s) => s.present).map((s) => s.id));
  const counted = new Set(statuses.filter((s) => s.counted).map((s) => s.id));
  return registers
    .map((r) => ({ dateKey: r.dateKey, status: r.entries[studentId] }))
    .filter((d): d is { dateKey: string; status: string } => Boolean(d.status) && counted.has(d.status!))
    .map((d) => ({ dateKey: d.dateKey, status: d.status, present: present.has(d.status) }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export async function getOwnAttendance(
  studentId: string,
  monthKey: string = dateKey(),
): Promise<PortalAttendance | null> {
  if (!(await assertOwnStudent(studentId))) return null;

  const doc = await getDb().collection(STUDENTS).doc(studentId).get();
  if (!doc.exists) return null;
  const student = toStudent(doc);

  const empty: PortalAttendance = {
    monthKey,
    summary: { present: 0, absent: 0, counted: 0, percent: null },
    days: [],
  };
  if (!student.classSection) return empty;

  const { from, to } = monthBounds(monthKey);
  const snap = await getDb()
    .collection(ATTENDANCE)
    .where("academicYear", "==", student.academicYear)
    .where("classSection", "==", student.classSection)
    .where("dateKey", ">=", from)
    .where("dateKey", "<=", to)
    .orderBy("dateKey", "desc")
    .limit(31)
    .get();

  const registers: Register[] = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      dateKey: x.dateKey,
      classSection: x.classSection,
      academicYear: x.academicYear,
      entries: x.entries ?? {},
      markedBy: x.markedBy ?? null,
      markedAtMs: x.markedAt?.toMillis?.() ?? null,
    };
  });

  const statuses = await getAttendanceStatuses();
  return {
    monthKey,
    summary: summarise(registers, studentId, statuses),
    days: ownDays(registers, studentId, statuses),
  };
}

export { listPayments };
