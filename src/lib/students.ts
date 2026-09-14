import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { feesOf, type StudentFees } from "@/lib/fees";
import { normalizeIndianPhone } from "@/lib/phone";

export type Program = string;

export const STUDENT_STATUSES = ["enrolled", "withdrawn", "graduated"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const STUDENT_STATUS_LABEL: Record<StudentStatus, string> = {
  enrolled: "Enrolled",
  withdrawn: "Withdrawn",
  graduated: "Graduated",
};

export type Guardian = {
  name: string;
  phone: string;
  email: string | null;
  relationship: string;
  isPrimary: boolean;
};

export type Medical = {
  allergies: string;
  conditions: string;
  notes: string;
  doctorName: string;
  doctorPhone: string;
};

export type Student = {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dobMs: number | null;
  program: Program;
  classSection: string | null;
  academicYear: string;
  status: StudentStatus;
  guardians: Guardian[];
  guardianPhones: string[];
  guardianEmails: string[];
  emergencyContact: { name: string; phone: string; relationship: string } | null;
  medical: Medical | null;
  photoPath: string | null;
  leadId: string | null;
  fees: StudentFees;
  createdAtMs: number | null;
  updatedAtMs: number | null;
};

export const COLLECTION = "students";

export const PAGE_SIZE = 25;
export const SEARCH_SCAN_LIMIT = 500;

export function toStudent(d: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): Student {
  const x = d.data() ?? {};
  const firstName = x.firstName ?? "";
  const lastName = x.lastName ?? "";
  return {
    id: d.id,
    admissionNumber: x.admissionNumber ?? "—",
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" ") || "—",
    dobMs: x.dob?.toMillis?.() ?? null,
    program: typeof x.program === "string" ? x.program : "",
    classSection: x.classSection ?? null,
    academicYear: x.academicYear ?? "",
    status: STUDENT_STATUSES.includes(x.status) ? x.status : "enrolled",
    guardians: Array.isArray(x.guardians) ? x.guardians : [],
    guardianPhones: Array.isArray(x.guardianPhones) ? x.guardianPhones : [],
    guardianEmails: Array.isArray(x.guardianEmails) ? x.guardianEmails : [],
    emergencyContact: x.emergencyContact ?? null,
    medical: x.medical ?? null,
    photoPath: x.photoPath ?? null,
    leadId: x.leadId ?? null,
    fees: feesOf(x),
    createdAtMs: x.createdAt?.toMillis?.() ?? null,
    updatedAtMs: x.updatedAt?.toMillis?.() ?? null,
  };
}

function baseQuery(status?: StudentStatus) {
  let q = getDb().collection(COLLECTION) as FirebaseFirestore.Query;
  if (status) q = q.where("status", "==", status);
  return q.orderBy("admissionNumber", "asc");
}

export function encodeCursor(s: Student): string {
  return s.admissionNumber;
}

export type StudentList = {
  rows: Student[];
  counts: Record<StudentStatus, number>;
  total: number;
  nextCursor: string | null;
  searchTruncated: boolean;
};

async function statusCounts(): Promise<Record<StudentStatus, number>> {
  const results = await Promise.all(
    STUDENT_STATUSES.map((s) =>
      getDb().collection(COLLECTION).where("status", "==", s).count().get().then((snap) => snap.data().count),
    ),
  );
  return Object.fromEntries(STUDENT_STATUSES.map((s, i) => [s, results[i]])) as Record<StudentStatus, number>;
}

function matchesSearch(s: Student, q: string): boolean {
  return [s.fullName, s.admissionNumber, s.classSection, ...s.guardians.flatMap((g) => [g.name, g.phone])]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q));
}

export async function listStudents(
  opts: { status?: StudentStatus; q?: string; cursor?: string } = {},
): Promise<StudentList> {
  await requireAdmin();

  const q = opts.q?.trim().toLowerCase();
  const counts = await statusCounts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (q) {
    const snap = await baseQuery(opts.status).limit(SEARCH_SCAN_LIMIT).get();
    return {
      rows: snap.docs.map(toStudent).filter((s) => matchesSearch(s, q)),
      counts,
      total,
      nextCursor: null,
      searchTruncated: snap.size === SEARCH_SCAN_LIMIT,
    };
  }

  let pageQuery = baseQuery(opts.status);
  if (opts.cursor) pageQuery = pageQuery.startAfter(opts.cursor);
  const snap = await pageQuery.limit(PAGE_SIZE + 1).get();
  const rows = snap.docs.slice(0, PAGE_SIZE).map(toStudent);

  return {
    rows,
    counts,
    total,
    nextCursor: snap.size > PAGE_SIZE && rows.length ? encodeCursor(rows[rows.length - 1]) : null,
    searchTruncated: false,
  };
}

export const MAX_CLASS_SIZE = 60;

export async function listClassRoster(classSection: string): Promise<Student[]> {
  await requireAdmin();
  const snap = await getDb()
    .collection(COLLECTION)
    .where("classSection", "==", classSection)
    .where("status", "==", "enrolled")
    .limit(MAX_CLASS_SIZE)
    .get();
  return snap.docs.map(toStudent).sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function getStudent(id: string): Promise<Student | null> {
  await requireAdmin();
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  return doc.exists ? toStudent(doc) : null;
}

export async function studentForLead(leadId: string): Promise<Student | null> {
  const snap = await getDb().collection(COLLECTION).where("leadId", "==", leadId).limit(1).get();
  return snap.empty ? null : toStudent(snap.docs[0]);
}

export function academicYearFor(date = new Date()): string {
  const startYear = date.getMonth() >= 5 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function nextAdmissionNumber(year: string, highest: string | null): string {
  const seq = highest ? Number(highest.split("-").pop()) : 0;
  const next = Number.isFinite(seq) ? seq + 1 : 1;
  return `AF-${year.split("-")[0]}-${String(next).padStart(4, "0")}`;
}

export function guardianEmailsFrom(guardians: { email?: string | null }[]): string[] {
  const keys = guardians
    .map((g) => (g.email ?? "").trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(keys)];
}

export function guardianPhonesFrom(guardians: { phone?: string | null }[]): string[] {
  const keys = guardians
    .map((g) => normalizeIndianPhone(g.phone ?? ""))
    .filter((v): v is string => Boolean(v));
  return [...new Set(keys)];
}
