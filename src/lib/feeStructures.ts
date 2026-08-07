import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

/**
 * Fee structures — what a year of school costs, defined once.
 *
 * Until now every child's total was typed in by hand on their own record. For
 * one enrolment that is fine; for a roll of two hundred it is two hundred
 * chances to key ₹2,500 where ₹25,000 was meant, and no way to answer "what is
 * the Nursery fee this year" without reading the roll.
 *
 * A structure is the school's price list: a named amount for an academic year,
 * optionally scoped to one program. Assigning it to a child copies the amount
 * onto `students/{id}.fees` rather than pointing at it.
 *
 * Copying rather than joining is deliberate, twice over:
 *
 *  - The parent portal and the dues list read a student and must not then read
 *    a structure per child to know what is owed. One document, one read.
 *  - A structure edited next year must not silently restate what last year's
 *    families were charged. The amount a child owes is a fact about that child
 *    at the moment it was assigned, not a live lookup.
 *
 * `structureId` is kept alongside the copied amount so the school can still see
 * which price list a child was put on, and re-apply it after a revision.
 *
 * The expansion plan (docs/EXPANSION_PLAN.md §2.4) proposed a separate
 * `feeAssignments/{studentId}` collection. It is exactly one document per
 * student, keyed by student id, read only alongside the student — which is a
 * description of fields on the student document. Folded in; one collection
 * fewer, and the portal's single read is preserved by construction.
 */

export const COLLECTION = "feeStructures";

/**
 * A school's price list is a page, not a database. The cap exists so this
 * query can never become an unbounded collection read (cost invariant 1); if a
 * school genuinely defines more than this many fees in a year, the list needs
 * pagination and someone should think about why.
 */
export const MAX_STRUCTURES = 100;

export type FeeStructure = {
  id: string;
  name: string;
  academicYear: string;
  /** Scope. Null means it applies to any program. */
  program: string | null;
  amountPaise: number;
  active: boolean;
  createdAtMs: number | null;
  updatedAtMs: number | null;
};

export function toStructure(
  d: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
): FeeStructure {
  const x = d.data() ?? {};
  return {
    id: d.id,
    name: x.name ?? "",
    academicYear: x.academicYear ?? "",
    program: x.program ?? null,
    amountPaise: Number(x.amountPaise) || 0,
    active: x.active === true,
    createdAtMs: x.createdAt?.toMillis?.() ?? null,
    updatedAtMs: x.updatedAt?.toMillis?.() ?? null,
  };
}

/**
 * What a child actually owes: the structure's amount, less any concession.
 *
 * Clamped at zero. A discount larger than the fee is a typo, and letting it
 * through would write a negative total, which the balance arithmetic would
 * then read as the school owing the family money.
 */
export function netTotalPaise(amountPaise: number, discountPaise: number): number {
  const net = Math.round(amountPaise) - Math.round(discountPaise);
  return net > 0 ? net : 0;
}

/** Newest first within a year, years newest first. Sorted in memory to avoid a
 * composite index on (academicYear, createdAt) for a list this small. */
function sortStructures(a: FeeStructure, b: FeeStructure): number {
  if (a.academicYear !== b.academicYear) return b.academicYear.localeCompare(a.academicYear);
  return (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
}

export async function listStructures(opts: { activeOnly?: boolean } = {}): Promise<FeeStructure[]> {
  // Auth in the data layer, not the layout — layouts do not re-render on client
  // navigation, so they are not a reliable gate.
  await requireAdmin();
  let q = getDb().collection(COLLECTION) as FirebaseFirestore.Query;
  // Filtered in the query, not in memory: this list is read on every student
  // page, and retired years should not be paid for on each of those loads.
  // Single-field equality, so Firestore's automatic index already covers it.
  if (opts.activeOnly) q = q.where("active", "==", true);
  const snap = await q.limit(MAX_STRUCTURES).get();
  return snap.docs.map(toStructure).sort(sortStructures);
}

export async function getStructure(id: string): Promise<FeeStructure | null> {
  await requireAdmin();
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  return doc.exists ? toStructure(doc) : null;
}
