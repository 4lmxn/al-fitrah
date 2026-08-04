import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

/**
 * Attendance.
 *
 * One document per class per day, holding a student → status map — NOT one
 * document per student per day. This is the single decision that keeps
 * attendance affordable, so it is worth stating the arithmetic.
 *
 * For a six-class school with twenty children each, over a 22-day month:
 *
 *   per class-day    6 × 22            =   132 writes/month,  1 read per register
 *   per student-day  6 × 20 × 22       = 2,640 writes/month, 20 reads per register
 *
 * Twenty times the writes, twenty times the reads, for a strictly worse query:
 * marking a register means writing one document either way, but reading one
 * back means twenty gets instead of one. Firestore's free tier is 20,000
 * writes/day, so the naive shape isn't fatal on its own — it is fatal in
 * combination with everything else, and it gets worse every year the school
 * grows while the good shape stays flat in class count.
 *
 * The document id is derived, not random: `{academicYear}_{section}_{date}`.
 * That makes marking idempotent (re-submitting overwrites rather than
 * duplicating), and it means opening today's register is a single get by id
 * with no query and no index at all.
 */

export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

// Statuses that count as "in school" for a percentage. Late is attendance;
// excused is an authorised absence and counts as neither present nor a mark
// against the child, so it is excluded from the denominator entirely.
const PRESENT_STATUSES = new Set<AttendanceStatus>(["present", "late"]);
const COUNTED_STATUSES = new Set<AttendanceStatus>(["present", "late", "absent"]);

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

/** Local calendar date as YYYY-MM-DD. Never toISOString — that shifts to UTC. */
export function dateKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function registerId(academicYear: string, classSection: string, key: string): string {
  return `${academicYear}_${classSection}_${key}`;
}

/** True for a date that is not a school day. Sunday only — Saturdays vary. */
export function isWeekend(key: string): boolean {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
}

export function isFuture(key: string, today = dateKey()): boolean {
  return key > today; // ISO dates compare correctly as strings
}

/**
 * Default status when a register has never been saved.
 *
 * Everyone present, because that is the common case and a teacher should only
 * have to mark the exceptions. Null on a Sunday or a future date, where there
 * is nothing to default — and defaulting those to "present" would manufacture
 * attendance for days that never happened.
 */
export function defaultStatusFor(key: string): AttendanceStatus | null {
  return isWeekend(key) || isFuture(key) ? null : "present";
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
  /** Percentage of counted days attended, or null when nothing is counted yet. */
  percent: number | null;
};

export function summarise(
  registers: Register[],
  studentId: string,
): StudentAttendance {
  let present = 0;
  let absent = 0;
  let counted = 0;
  for (const r of registers) {
    const status = r.entries[studentId];
    if (!status || !COUNTED_STATUSES.has(status)) continue;
    counted += 1;
    if (PRESENT_STATUSES.has(status)) present += 1;
    else absent += 1;
  }
  return {
    present,
    absent,
    counted,
    // Guard the divide: a child enrolled today has no counted days, and 0/0
    // rendered as "0% attendance" would read as a truancy problem.
    percent: counted === 0 ? null : Math.round((present / counted) * 100),
  };
}

/**
 * Registers for one class across a date range.
 *
 * Reads are bounded by the range, not by class size — a month is at most ~31
 * documents however many children are in the class.
 */
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
    .limit(62) // two months of school days; the UI never asks for more
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

/** First and last day of the month containing `key`, as date keys. */
export function monthBounds(key: string): { from: string; to: string } {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const p = (n: number) => String(n).padStart(2, "0");
  return { from: `${y}-${p(m)}-01`, to: `${y}-${p(m)}-${p(last)}` };
}
