import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

export type EmploymentType = string;

export type JobOpening = {
  id: string;
  title: string;
  employmentType: string;
  summary: string;
  requirements: string[];
  active: boolean;
  order: number;
  createdAtMs: number | null;
  updatedAtMs: number | null;
};

const COLLECTION = "jobOpenings";

function toOpening(id: string, x: FirebaseFirestore.DocumentData): JobOpening {
  return {
    id,
    title: x.title ?? "",
    employmentType: x.employmentType ?? "Full-time",
    summary: x.summary ?? "",
    requirements: Array.isArray(x.requirements) ? x.requirements : [],
    active: x.active ?? false,
    order: typeof x.order === "number" ? x.order : 0,
    createdAtMs: x.createdAt?.toMillis?.() ?? null,
    updatedAtMs: x.updatedAt?.toMillis?.() ?? null,
  };
}

function sortOpenings(a: JobOpening, b: JobOpening): number {
  if (a.order !== b.order) return a.order - b.order;
  return (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
}

export async function listActiveOpenings(): Promise<JobOpening[]> {
  const snap = await getDb().collection(COLLECTION).where("active", "==", true).get();
  return snap.docs.map((d) => toOpening(d.id, d.data())).sort(sortOpenings);
}

export async function listAllOpenings(): Promise<JobOpening[]> {
  await requireAdmin();
  const snap = await getDb().collection(COLLECTION).get();
  return snap.docs.map((d) => toOpening(d.id, d.data())).sort(sortOpenings);
}

export async function getOpening(id: string): Promise<JobOpening | null> {
  await requireAdmin();
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return toOpening(doc.id, doc.data()!);
}
