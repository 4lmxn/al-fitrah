import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { academicYearFor } from "@/lib/students";

export type AttendanceStatus = string;

export const COLLECTION = "attendance";
export const ROLLUPS = "attendanceRollups";

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

export type Rollup = {
  month: string;
  academicYear: string;
  classSection: string;
  days: Record<string, Record<string, number>>;
};

export type MonthTotals = {
  month: string;
  present: number;
  absent: number;
  counted: number;
  percent: number | null;
  daysMarked: number;
};

export function rollupId(academicYear: string, classSection: string, month: string): string {
  return `${academicYear}_${classSection}_${month}`;
}

export function monthOf(key: string): string {
  return key.slice(0, 7);
}

export function countByStatus(
  entries: Record<string, AttendanceStatus>,
  statusIds: string[],
): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(statusIds.map((id) => [id, 0]));
  for (const status of Object.values(entries)) {
    if (status in counts) counts[status] += 1;
  }
  return counts;
}

export function academicYearMonths(academicYear: string): string[] {
  const start = Number(academicYear.split("-")[0]);
  const p = (n: number) => String(n).padStart(2, "0");
  return Array.from({ length: 12 }, (_, i) => {
    const month = 6 + i;
    return month <= 12 ? `${start}-${p(month)}` : `${start + 1}-${p(month - 12)}`;
  });
}

export function recentAcademicYears(count = 3, from = new Date()): string[] {
  const current = Number(academicYearFor(from).split("-")[0]);
  return Array.from({ length: count }, (_, i) => {
    const start = current - i;
    return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
  });
}

export function summariseMonth(
  rollup: Rollup | null,
  month: string,
  statuses: { id: string; present: boolean; counted: boolean }[],
): MonthTotals {
  const empty = { month, present: 0, absent: 0, counted: 0, percent: null, daysMarked: 0 };
  if (!rollup) return empty;

  let present = 0;
  let counted = 0;
  let daysMarked = 0;

  for (const day of Object.values(rollup.days)) {
    let dayCounted = 0;
    for (const status of statuses) {
      const n = day[status.id] ?? 0;
      if (n === 0 || !status.counted) continue;
      dayCounted += n;
      if (status.present) present += n;
    }
    if (dayCounted > 0) daysMarked += 1;
    counted += dayCounted;
  }

  return {
    month,
    present,
    absent: counted - present,
    counted,
    percent: counted === 0 ? null : Math.round((present / counted) * 100),
    daysMarked,
  };
}

export function totalOf(months: MonthTotals[]): MonthTotals {
  const present = months.reduce((n, m) => n + m.present, 0);
  const counted = months.reduce((n, m) => n + m.counted, 0);
  return {
    month: "",
    present,
    absent: counted - present,
    counted,
    percent: counted === 0 ? null : Math.round((present / counted) * 100),
    daysMarked: months.reduce((n, m) => n + m.daysMarked, 0),
  };
}

export async function getRollups(
  academicYear: string,
  classSection: string,
): Promise<Map<string, Rollup>> {
  await requireAdmin();
  const db = getDb();
  const months = academicYearMonths(academicYear);
  const docs = await db.getAll(
    ...months.map((month) => db.collection(ROLLUPS).doc(rollupId(academicYear, classSection, month))),
  );
  const found = new Map<string, Rollup>();
  for (const doc of docs) {
    if (!doc.exists) continue;
    const x = doc.data()!;
    found.set(x.month, {
      month: x.month,
      academicYear: x.academicYear ?? academicYear,
      classSection: x.classSection ?? classSection,
      days: x.days ?? {},
    });
  }
  return found;
}

export function attendanceMatrix(
  roster: { id: string; admissionNumber: string; fullName: string }[],
  registers: Register[],
  statuses: { id: string; present: boolean; counted: boolean }[],
): { header: string[]; rows: (string | number)[][] } {
  const days = [...registers].sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const header = [
    "Admission no.",
    "Name",
    ...days.map((d) => d.dateKey),
    "Present",
    "Absent",
    "Counted",
    "Attendance %",
  ];

  const rows = roster.map((s) => {
    const total = summarise(days, s.id, statuses);
    return [
      s.admissionNumber,
      s.fullName,
      ...days.map((d) => d.entries[s.id] ?? ""),
      total.present,
      total.absent,
      total.counted,
      total.percent ?? "",
    ];
  });

  return { header, rows };
}
