import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { feesOf, type StudentFees } from "@/lib/fees";
import { normalizeIndianPhone } from "@/lib/phone";

/**
 * Students.
 *
 * Its own collection, deliberately — not a third `type` in `leads`.
 *
 * `leads` already holds two shapes that disagree (`parentName` vs `name`,
 * `childAge` vs `role`), and every query there filters on `type` first. Adding
 * students would mean a third disjoint field set behind the same discriminator,
 * so every read would fetch fields it can't use and every index would carry
 * documents it can't match. A student also has a different lifecycle from a
 * lead: a lead ends, a student persists for years and accumulates attendance
 * and fees. Those are separate collections for the same reason.
 *
 * A lead does not become a student — it produces one, and the lead stays as the
 * record of how the family arrived. `leadId` keeps that provenance.
 */

export type Program = string;


// Student status stays a fixed union: unlike programs or class sections these
// are structural — enrolled/withdrawn/graduated drive queries and the roster,
// and a school inventing a fourth would have no defined behaviour.
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

/**
 * Medical notes are health data about a child — the most sensitive thing this
 * system stores, and under DPDP the most consequential to leak. Kept on the
 * student document rather than a subcollection on purpose: a teacher needs the
 * allergy line at the moment something goes wrong, and a second read is a
 * second thing that can fail when it matters most.
 */
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
  /**
   * Normalised guardian numbers, flat, for parent sign-in.
   *
   * Duplicates what is inside `guardians[]` on purpose: Firestore cannot match
   * a field inside an array of objects, so without this every parent page load
   * would scan the whole roll. Written by the same code that writes guardians,
   * so the two cannot drift.
   */
  guardianPhones: string[];
  emergencyContact: { name: string; phone: string; relationship: string } | null;
  medical: Medical | null;
  /** The enquiry this student came from, when there was one. */
  leadId: string | null;
  fees: StudentFees;
  createdAtMs: number | null;
  updatedAtMs: number | null;
};

export const COLLECTION = "students";

// Same ceiling discipline as the leads inbox: page size bounds the read count,
// and counts come from aggregations rather than from fetching to count.
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
    emergencyContact: x.emergencyContact ?? null,
    medical: x.medical ?? null,
    leadId: x.leadId ?? null,
    fees: feesOf(x),
    createdAtMs: x.createdAt?.toMillis?.() ?? null,
    updatedAtMs: x.updatedAt?.toMillis?.() ?? null,
  };
}

// Ordered by admission number rather than createdAt: it is the identifier staff
// actually use, it is unique, and it gives the cursor a total order for free.
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
  // Auth in the data layer, not the layout — layouts don't re-render on client
  // navigation, so they are not a reliable gate.
  await requireAdmin();

  const q = opts.q?.trim().toLowerCase();
  const counts = await statusCounts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (q) {
    // No index backs substring search. Bounded scan, and the UI says so.
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
  // One extra row reveals whether another page exists, with no second query.
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

/**
 * The children to show on a class register.
 *
 * Only enrolled students: a withdrawn child must not keep appearing on a
 * register to be marked absent every day. Bounded because a preschool class is
 * bounded — if a section ever exceeds this, the section is the problem.
 */
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

/** Has this lead already produced a student? Guards double conversion. */
export async function studentForLead(leadId: string): Promise<Student | null> {
  const snap = await getDb().collection(COLLECTION).where("leadId", "==", leadId).limit(1).get();
  return snap.empty ? null : toStudent(snap.docs[0]);
}

/**
 * Academic year label for a date, e.g. "2026-27".
 *
 * The Indian school year starts in June, so January to May belongs to the year
 * that began the previous June — a naive `getFullYear()` would file a child
 * admitted in March under the year that hasn't started yet.
 */
export function academicYearFor(date = new Date()): string {
  const startYear = date.getMonth() >= 5 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/**
 * Next admission number for a year, as `AF-2026-0001`.
 *
 * Derived by reading the highest existing number for the year rather than kept
 * in a counter document: admissions happen a few times a day at most, so a
 * counter would be a hot document and a migration for no benefit. Zero-padded
 * so string ordering matches numeric ordering, which is what lets the list
 * paginate on this field.
 *
 * ponytail: two admissions created in the same second could collide. The
 * caller runs this inside a transaction, which is what makes that safe.
 */
export function nextAdmissionNumber(year: string, highest: string | null): string {
  const seq = highest ? Number(highest.split("-").pop()) : 0;
  const next = Number.isFinite(seq) ? seq + 1 : 1;
  return `AF-${year.split("-")[0]}-${String(next).padStart(4, "0")}`;
}

/**
 * Derive the flat, normalised phone list from a guardian array.
 *
 * Single source for the duplication: anything that writes `guardians` calls
 * this for `guardianPhones`, so a guardian added without a login, or a login
 * surviving a removed guardian, cannot happen.
 */
export function guardianPhonesFrom(guardians: { phone?: string | null }[]): string[] {
  const keys = guardians
    .map((g) => normalizeIndianPhone(g.phone ?? ""))
    .filter((v): v is string => Boolean(v));
  return [...new Set(keys)];
}
