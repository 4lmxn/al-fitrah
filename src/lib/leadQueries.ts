import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { PIPELINES, normalizeStage, type LeadType } from "@/lib/leads";
import { stageMeta, type StageGroup } from "@/lib/stageMeta";
import { needsAttention } from "@/lib/attention";
import { noteCountOf, readNotes } from "@/lib/notes";

export { needsAttention };

export type LeadRow = {
  id: string;
  type: LeadType;
  name: string;
  childName?: string | null;
  phone: string;
  whatsapp?: boolean;
  email: string | null;
  stage: string;
  role?: string;
  childAge?: string;
  programInterest?: string | null;
  source?: string | null;
  utmSource?: string | null;
  referredBy?: string | null;
  noteCount: number;
  createdAtMs: number | null;
  followUpMs: number | null;
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
      childName: x.childName ?? null,
      phone: x.phone ?? "—",
      whatsapp: x.whatsapp ?? false,
      email: x.email ?? null,
      stage: normalizeStage(x.stage ?? "new"),
      role: x.role,
      childAge: x.childAge,
      programInterest: x.programInterest ?? null,
      source: x.source ?? null,
      utmSource: x.utm?.source ?? null,
      referredBy: x.referredBy ?? null,
      noteCount: noteCountOf(x),
      createdAtMs: x.createdAt?.toMillis?.() ?? null,
      followUpMs: x.followUpDate?.toMillis?.() ?? null,
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
  attentionCount: number;
};

// One read per inbox view: fetch all leads of a type, derive per-stage counts
// and KPI groups, then apply the stage/search/attention filters in memory.
export async function getInbox(
  type: LeadType,
  opts: { stage?: string; q?: string; attention?: boolean } = {},
): Promise<Inbox> {
  const all = await listLeads(type); // newest-first, all stages

  const counts: Record<string, number> = {};
  for (const s of PIPELINES[type]) counts[s] = 0;
  const kpis: InboxKpis = { total: all.length, new: 0, active: 0, won: 0, lost: 0 };
  const now = Date.now();
  let attentionCount = 0;
  for (const r of all) {
    if (r.stage in counts) counts[r.stage] += 1;
    kpis[stageMeta(r.stage).group] += 1;
    if (needsAttention(r, now)) attentionCount += 1;
  }

  const q = opts.q?.trim().toLowerCase();
  let rows = all;
  // The attention view ignores the stage filter — it's a cross-stage triage list.
  if (opts.attention) rows = rows.filter((r) => needsAttention(r, now));
  else if (opts.stage) rows = rows.filter((r) => r.stage === opts.stage);
  if (q) {
    rows = rows.filter((r) =>
      [r.name, r.childName, r.phone, r.email, r.role, r.childAge]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }

  return { rows, counts, kpis, attentionCount };
}

// ── Marketing insights ──────────────────────────────────────────────────────

export type SourceCount = { source: string; total: number; thisMonth: number };
export type FunnelStep = { stage: string; label: string; count: number };
export type ReferrerCount = { code: string; total: number; admitted: number };

export type Insights = {
  totalThisMonth: number;
  sources: SourceCount[];
  funnel: FunnelStep[];
  referrers: ReferrerCount[];
};

// Single-read marketing summary over admission leads: which channels produced
// enquiries (all-time + this month), how many sit at each funnel stage, and who
// referred whom. All derived in one in-memory pass — no extra Firestore reads.
export async function getInsights(): Promise<Insights> {
  const all = await listLeads("admission_inquiry");

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartMs = monthStart.getTime();

  const sourceMap = new Map<string, { total: number; thisMonth: number }>();
  const referrerMap = new Map<string, { total: number; admitted: number }>();
  const funnelStages = ["new", "contacted", "visited", "applied", "admitted"];
  const funnelCounts: Record<string, number> = Object.fromEntries(funnelStages.map((s) => [s, 0]));

  let totalThisMonth = 0;
  for (const r of all) {
    const isThisMonth = r.createdAtMs != null && r.createdAtMs >= monthStartMs;
    if (isThisMonth) totalThisMonth += 1;

    // Prefer an explicit UTM source; fall back to the capture surface (source).
    const src = r.utmSource || r.source || "direct";
    const s = sourceMap.get(src) ?? { total: 0, thisMonth: 0 };
    s.total += 1;
    if (isThisMonth) s.thisMonth += 1;
    sourceMap.set(src, s);

    if (r.referredBy) {
      const ref = referrerMap.get(r.referredBy) ?? { total: 0, admitted: 0 };
      ref.total += 1;
      if (r.stage === "admitted") ref.admitted += 1;
      referrerMap.set(r.referredBy, ref);
    }

    // Funnel is cumulative: reaching a later stage implies the earlier ones.
    const idx = funnelStages.indexOf(r.stage);
    if (idx >= 0) for (let i = 0; i <= idx; i++) funnelCounts[funnelStages[i]] += 1;
  }

  const sources = [...sourceMap.entries()]
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.total - a.total);

  const funnel = funnelStages.map((stage) => ({ stage, label: stageMeta(stage).label, count: funnelCounts[stage] }));

  const referrers = [...referrerMap.entries()]
    .map(([code, v]) => ({ code, ...v }))
    .sort((a, b) => b.total - a.total);

  return { totalThisMonth, sources, funnel, referrers };
}

export type LeadNote = { text: string; author: string; atMs: number | null; kind: "note" | "stage" };

export type LeadDetail = {
  id: string;
  type: LeadType;
  name: string;
  childName: string | null;
  phone: string;
  whatsapp: boolean;
  email: string | null;
  message: string | null;
  stage: string;
  role?: string;
  childAge?: string;
  childDob?: string | null;
  programInterest?: string | null;
  source?: string | null;
  utm?: { source?: string; medium?: string; campaign?: string } | null;
  referredBy?: string | null;
  cv?: { filename: string } | null;
  notes: LeadNote[];
  createdAtMs: number | null;
  updatedAtMs: number | null;
  followUpMs: number | null;
};

export async function getLead(id: string): Promise<LeadDetail | null> {
  await requireAdmin();
  const db = getDb();
  const doc = await db.collection("leads").doc(id).get();
  if (!doc.exists) return null;
  const x = doc.data()!;
  const notes = await readNotes(db, id, x);
  return {
    id: doc.id,
    type: x.type,
    name: x.name ?? x.parentName ?? "—",
    childName: x.childName ?? null,
    phone: x.phone ?? "—",
    whatsapp: x.whatsapp ?? false,
    email: x.email ?? null,
    message: x.message ?? null,
    stage: normalizeStage(x.stage ?? "new"),
    role: x.role,
    childAge: x.childAge,
    childDob: x.childDob ?? null,
    programInterest: x.programInterest ?? null,
    source: x.source ?? null,
    utm: x.utm ?? null,
    referredBy: x.referredBy ?? null,
    cv: x.cv ? { filename: x.cv.filename } : null,
    notes,
    createdAtMs: x.createdAt?.toMillis?.() ?? null,
    updatedAtMs: x.updatedAt?.toMillis?.() ?? null,
    followUpMs: x.followUpDate?.toMillis?.() ?? null,
  };
}
