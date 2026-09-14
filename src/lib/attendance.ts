import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

export type AttendanceStatus = string;

export const COLLECTION = "attendance";

export type Register = {
  id: string;
  dateKey: string;
  classSection: string;
  academicYear: string;
  entries: Record<string, AttendanceStatus>;
  markedBy: string | null;
  markedAtMs: number | null;
};

export function dateKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function registerId(academicYear: string, classSection: string, key: string): string {
  return `${academicYear}_${classSection}_${key}`;
}

export function isWeekend(key: string, nonSchoolDays: number[] = [0]): boolean {
  const [y, m, d] = key.split("-").map(Number);
  return nonSchoolDays.includes(new Date(y, m - 1, d).getDay());
}

export function isFuture(key: string, today = dateKey()): boolean {
  return key > today;
}

export function defaultStatusFor(key: string, statuses: { id: string; present: boolean }[], nonSchoolDays: number[] = [0]): AttendanceStatus | null {
  if (isWeekend(key, nonSchoolDays) || isFuture(key)) return null;
  return statuses.find((s) => s.present)?.id ?? statuses[0]?.id ?? null;
}

export async function getRegister(
  academicYear: string,
  classSection: string,
  key: string,
): Promise<Register | null> {
  await requireAdmin();
  const doc = await getDb().collection(COLLECTION).doc(registerId(academicYear, classSection, key)).get();
  if (!doc.exists) return null;
  const x = doc.data()!;
  return {
    id: doc.id,
    dateKey: x.dateKey ?? key,
    classSection: x.classSection ?? classSection,
    academicYear: x.academicYear ?? academicYear,
    entries: x.entries ?? {},
    markedBy: x.markedBy ?? null,
    markedAtMs: x.markedAt?.toMillis?.() ?? null,
  };
}

export type StudentAttendance = {
  present: number;
  absent: number;
  counted: number;
  percent: number | null;
};

export function summarise(
  registers: Register[],
  studentId: string,
  statuses: { id: string; present: boolean; counted: boolean }[],
): StudentAttendance {
  const present_ = new Set(statuses.filter((s) => s.present).map((s) => s.id));
  const counted_ = new Set(statuses.filter((s) => s.counted).map((s) => s.id));
  let present = 0;
  let absent = 0;
  let counted = 0;
  for (const r of registers) {
    const status = r.entries[studentId];
    if (!status || !counted_.has(status)) continue;
    counted += 1;
    if (present_.has(status)) present += 1;
    else absent += 1;
  }
  return {
    present,
    absent,
    counted,
    percent: counted === 0 ? null : Math.round((present / counted) * 100),
  };
}

export async function listRegisters(
  academicYear: string,
  classSection: string,
  fromKey: string,
  toKey: string,
): Promise<Register[]> {
  await requireAdmin();
  const snap = await getDb()
    .collection(COLLECTION)
    .where("academicYear", "==", academicYear)
    .where("classSection", "==", classSection)
    .where("dateKey", ">=", fromKey)
    .where("dateKey", "<=", toKey)
    .orderBy("dateKey", "desc")
    .limit(62)
    .get();
  return snap.docs.map((d) => {
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
}

export function monthBounds(key: string): { from: string; to: string } {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const p = (n: number) => String(n).padStart(2, "0");
  return { from: `${y}-${p(m)}-01`, to: `${y}-${p(m)}-${p(last)}` };
}
