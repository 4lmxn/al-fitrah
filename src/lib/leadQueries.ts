import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import type { LeadType } from "@/lib/leads";

export type LeadRow = {
  id: string;
  type: LeadType;
  name: string;
  phone: string;
  email: string | null;
  stage: string;
  role?: string;
  childAge?: string;
  createdAtMs: number | null;
};

export async function listLeads(type: LeadType, stage?: string): Promise<LeadRow[]> {
  let q = getDb().collection("leads").where("type", "==", type);
  if (stage) q = q.where("stage", "==", stage);
  const snap = await q.get();
  const rows: LeadRow[] = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      type: x.type,
      name: x.name ?? x.parentName ?? "—",
      phone: x.phone ?? "—",
      email: x.email ?? null,
      stage: x.stage ?? "new",
      role: x.role,
      childAge: x.childAge,
      createdAtMs: x.createdAt?.toMillis?.() ?? null,
    };
  });
  // Sort newest first in memory (avoids needing a composite index for type+stage+createdAt).
  rows.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
  return rows;
}

export type LeadNote = { text: string; author: string; atMs: number | null };

export type LeadDetail = {
  id: string;
  type: LeadType;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  stage: string;
  role?: string;
  childAge?: string;
  cv?: { filename: string } | null;
  notes: LeadNote[];
  createdAtMs: number | null;
};

export async function getLead(id: string): Promise<LeadDetail | null> {
  const doc = await getDb().collection("leads").doc(id).get();
  if (!doc.exists) return null;
  const x = doc.data()!;
  return {
    id: doc.id,
    type: x.type,
    name: x.name ?? x.parentName ?? "—",
    phone: x.phone ?? "—",
    email: x.email ?? null,
    message: x.message ?? null,
    stage: x.stage ?? "new",
    role: x.role,
    childAge: x.childAge,
    cv: x.cv ? { filename: x.cv.filename } : null,
    notes: (x.notes ?? []).map((n: { text: string; author: string; at?: { toMillis?: () => number } }) => ({
      text: n.text,
      author: n.author,
      atMs: n.at?.toMillis?.() ?? null,
    })),
    createdAtMs: x.createdAt?.toMillis?.() ?? null,
  };
}
