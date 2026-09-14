import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

export const COLLECTION = "feeStructures";

const MAX_STRUCTURES = 100;

export type FeeStructure = {
  id: string;
  name: string;
  academicYear: string;
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

export function netTotalPaise(amountPaise: number, discountPaise: number): number {
  const net = Math.round(amountPaise) - Math.round(discountPaise);
  return net > 0 ? net : 0;
}

function sortStructures(a: FeeStructure, b: FeeStructure): number {
  if (a.academicYear !== b.academicYear) return b.academicYear.localeCompare(a.academicYear);
  return (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
}

export async function listStructures(opts: { activeOnly?: boolean } = {}): Promise<FeeStructure[]> {
  await requireAdmin();
  let q = getDb().collection(COLLECTION) as FirebaseFirestore.Query;
  if (opts.activeOnly) q = q.where("active", "==", true);
  const snap = await q.limit(MAX_STRUCTURES).get();
  return snap.docs.map(toStructure).sort(sortStructures);
}
