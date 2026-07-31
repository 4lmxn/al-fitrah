import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { PIPELINES, type LeadType } from "@/lib/leads";
import { stageMeta, type StageGroup } from "@/lib/stageMeta";

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
  // Auth is enforced in the data layer, not just the admin layout: layouts
  // don't re-render on client navigation, so they are not a reliable gate.
  await requireAdmin();
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

export type InboxKpis = Record<StageGroup, number> & { total: number };

export type Inbox = {
  rows: LeadRow[];
  counts: Record<string, number>; // per-stage counts (unfiltered by stage)
  kpis: InboxKpis;
};

// One read per inbox view: fetch all leads of a type, derive per-stage counts
// and KPI groups, then apply the stage + search filters in memory.
export async function getInbox(
  type: LeadType,
  opts: { stage?: string; q?: string } = {},
): Promise<Inbox> {
  const all = await listLeads(type); // newest-first, all stages

  const counts: Record<string, number> = {};
  for (const s of PIPELINES[type]) counts[s] = 0;
  const kpis: InboxKpis = { total: all.length, new: 0, active: 0, won: 0, lost: 0 };
  for (const r of all) {
    if (r.stage in counts) counts[r.stage] += 1;
    kpis[stageMeta(r.stage).group] += 1;
  }

  const q = opts.q?.trim().toLowerCase();
  let rows = all;
  if (opts.stage) rows = rows.filter((r) => r.stage === opts.stage);
  if (q) {
    rows = rows.filter((r) =>
      [r.name, r.phone, r.email, r.role, r.childAge]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }

  return { rows, counts, kpis };
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
  await requireAdmin();
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
