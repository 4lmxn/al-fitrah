import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { normalizeStage, type LeadType } from "@/lib/leads";
import { findStage, type StageGroup, type StageView } from "@/lib/stageMeta";
import { getPipeline } from "@/lib/pipelines";
import { needsAttention } from "@/lib/attention";
import { noteCountOf, readNotesRaw, resolveNotes } from "@/lib/notes";

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
  assignedTo: string | null;
  possibleDuplicateOf: string | null;
  tags: string[];
  createdAtMs: number | null;
  followUpMs: number | null;
};

export const PAGE_SIZE = 25;

export const SEARCH_SCAN_LIMIT = 500;

const EPOCH = new Date(0);
const DAY_MS = 24 * 60 * 60 * 1000;

function toRow(d: FirebaseFirestore.QueryDocumentSnapshot): LeadRow {
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
    assignedTo: x.assignedTo ?? null,
    possibleDuplicateOf: x.possibleDuplicateOf ?? null,
    tags: Array.isArray(x.tags) ? x.tags : [],
    createdAtMs: x.createdAt?.toMillis?.() ?? null,
    followUpMs: x.followUpDate?.toMillis?.() ?? null,
  };
}

function baseQuery(type: LeadType, stage?: string, assignee?: string, tag?: string) {
  let q = getDb().collection("leads").where("type", "==", type);
  if (stage) q = q.where("stage", "==", stage);
  if (assignee === "unassigned") q = q.where("assignedTo", "==", null);
  else if (assignee) q = q.where("assignedTo", "==", assignee);
  if (tag) q = q.where("tags", "array-contains", tag);
  return q.orderBy("createdAt", "desc").orderBy("__name__", "desc");
}

export type Cursor = { createdAtMs: number; id: string };

export function encodeCursor(row: LeadRow): string | null {
  return row.createdAtMs == null ? null : `${row.createdAtMs}.${row.id}`;
}

export function decodeCursor(raw?: string): Cursor | null {
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const createdAtMs = Number(raw.slice(0, dot));
  const id = raw.slice(dot + 1);
  return Number.isFinite(createdAtMs) && id ? { createdAtMs, id } : null;
}

export type InboxKpis = Record<StageGroup, number> & { total: number };

export type Inbox = {
  rows: LeadRow[];
  counts: Record<string, number>;
  kpis: InboxKpis;
  attentionCount: number;
  nextCursor: string | null;
  searchTruncated: boolean;
  pipeline: StageView[];
};

async function stageCounts(type: LeadType, stages: string[]): Promise<Record<string, number>> {
  const results = await Promise.all(
    stages.map((s) =>
      getDb()
        .collection("leads")
        .where("type", "==", type)
        .where("stage", "==", s)
        .count()
        .get()
        .then((snap) => snap.data().count),
    ),
  );
  return Object.fromEntries(stages.map((s, i) => [s, results[i]]));
}

function overdueQuery(type: LeadType, startOfToday: Date) {
  return getDb()
    .collection("leads")
    .where("type", "==", type)
    .where("followUpDate", ">=", EPOCH)
    .where("followUpDate", "<", startOfToday);
}

function untouchedQuery(type: LeadType, cutoff: Date) {
  return getDb()
    .collection("leads")
    .where("type", "==", type)
    .where("stage", "==", "new")
    .where("noteCount", "==", 0)
    .where("createdAt", "<", cutoff);
}

function attentionBounds(now: number) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return { startOfToday, cutoff: new Date(now - 2 * DAY_MS) };
}

async function attentionCountOf(type: LeadType, now: number): Promise<number> {
  const { startOfToday, cutoff } = attentionBounds(now);
  const [overdue, untouched] = await Promise.all([
    overdueQuery(type, startOfToday).count().get(),
    untouchedQuery(type, cutoff).count().get(),
  ]);
  return overdue.data().count + untouched.data().count;
}

const ATTENTION_LIMIT = 100;

async function attentionRows(type: LeadType, now: number): Promise<LeadRow[]> {
  const { startOfToday, cutoff } = attentionBounds(now);
  const [overdue, untouched] = await Promise.all([
    overdueQuery(type, startOfToday).limit(ATTENTION_LIMIT).get(),
    untouchedQuery(type, cutoff).limit(ATTENTION_LIMIT).get(),
  ]);

  const byId = new Map<string, LeadRow>();
  for (const d of [...overdue.docs, ...untouched.docs]) byId.set(d.id, toRow(d));
  return [...byId.values()].sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
}

function matchesSearch(r: LeadRow, q: string): boolean {
  return [r.name, r.childName, r.phone, r.email, r.role, r.childAge, ...r.tags]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q));
}

export async function getInbox(
  type: LeadType,
  opts: { stage?: string; q?: string; attention?: boolean; cursor?: string; assignee?: string; tag?: string } = {},
): Promise<Inbox> {
  await requireAdmin();

  const now = Date.now();
  const q = opts.q?.trim().toLowerCase();
  const pipeline = await getPipeline(type);

  const rowsPromise: Promise<{ rows: LeadRow[]; nextCursor: string | null; searchTruncated: boolean }> =
    opts.attention
      ?
        attentionRows(type, now).then((r) => ({
          rows: q ? r.filter((row) => matchesSearch(row, q)) : r,
          nextCursor: null,
          searchTruncated: false,
        }))
      : q
        ?
          baseQuery(type, opts.stage, opts.assignee, opts.tag)
            .limit(SEARCH_SCAN_LIMIT)
            .get()
            .then((snap) => ({
              rows: snap.docs.map(toRow).filter((r) => matchesSearch(r, q)),
              nextCursor: null,
              searchTruncated: snap.size === SEARCH_SCAN_LIMIT,
            }))
        : (() => {
            const cursor = decodeCursor(opts.cursor);
            let pageQuery = baseQuery(type, opts.stage, opts.assignee, opts.tag);
            if (cursor) pageQuery = pageQuery.startAfter(new Date(cursor.createdAtMs), cursor.id);
            return pageQuery
              .limit(PAGE_SIZE + 1)
              .get()
              .then((snap) => {
                const rows = snap.docs.slice(0, PAGE_SIZE).map(toRow);
                return {
                  rows,
                  nextCursor:
                    snap.size > PAGE_SIZE && rows.length ? encodeCursor(rows[rows.length - 1]) : null,
                  searchTruncated: false,
                };
              });
          })();

  const [counts, attentionCount, page] = await Promise.all([
    stageCounts(type, pipeline.map((s) => s.id)),
    attentionCountOf(type, now),
    rowsPromise,
  ]);

  const kpis: InboxKpis = { total: 0, new: 0, active: 0, won: 0, lost: 0 };
  for (const [stage, n] of Object.entries(counts)) {
    kpis.total += n;
    kpis[findStage(pipeline, stage).group] += n;
  }

  return { ...page, counts, kpis, attentionCount, pipeline };
}

export const BOARD_COLUMN_SIZE = 10;

export type BoardColumn = {
  stage: string;
  total: number;
  rows: LeadRow[];
};

export type Board = { columns: BoardColumn[]; pipeline: StageView[]; attentionCount: number };

export async function getBoard(type: LeadType): Promise<Board> {
  await requireAdmin();
  const pipeline = await getPipeline(type);
  const now = Date.now();

  const [columns, attentionCount] = await Promise.all([
    Promise.all(
      pipeline.map(async (s): Promise<BoardColumn> => {
        const [snap, agg] = await Promise.all([
          baseQuery(type, s.id).limit(BOARD_COLUMN_SIZE).get(),
          getDb()
            .collection("leads")
            .where("type", "==", type)
            .where("stage", "==", s.id)
            .count()
            .get(),
        ]);
        return { stage: s.id, total: agg.data().count, rows: snap.docs.map(toRow) };
      }),
    ),
    attentionCountOf(type, now),
  ]);

  return { columns, pipeline, attentionCount };
}

export type SourceCount = { source: string; total: number; thisMonth: number };
export type FunnelStep = { stage: string; label: string; count: number };
export type ReferrerCount = { code: string; total: number; admitted: number };

export type Insights = {
  totalThisMonth: number;
  sources: SourceCount[];
  funnel: FunnelStep[];
  referrers: ReferrerCount[];
};

export const INSIGHTS_SCAN_LIMIT = 500;

export async function getInsights(): Promise<Insights> {
  await requireAdmin();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartMs = monthStart.getTime();

  const admissionPipeline = await getPipeline("admission_inquiry");
  const funnelStages = admissionPipeline.filter((s) => s.group !== "lost").map((s) => s.id);

  const [counts, monthSnap, recentSnap] = await Promise.all([
    stageCounts("admission_inquiry", admissionPipeline.map((s) => s.id)),
    getDb()
      .collection("leads")
      .where("type", "==", "admission_inquiry")
      .where("createdAt", ">=", monthStart)
      .count()
      .get(),
    baseQuery("admission_inquiry").limit(INSIGHTS_SCAN_LIMIT).get(),
  ]);

  const totalThisMonth = monthSnap.data().count;

  const funnelCounts: Record<string, number> = Object.fromEntries(funnelStages.map((s) => [s, 0]));
  for (const [stage, n] of Object.entries(counts)) {
    const idx = funnelStages.indexOf(stage);
    if (idx >= 0) for (let i = 0; i <= idx; i++) funnelCounts[funnelStages[i]] += n;
  }

  const sourceMap = new Map<string, { total: number; thisMonth: number }>();
  const referrerMap = new Map<string, { total: number; admitted: number }>();

  for (const r of recentSnap.docs.map(toRow)) {
    const isThisMonth = r.createdAtMs != null && r.createdAtMs >= monthStartMs;

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
  }

  const sources = [...sourceMap.entries()]
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.total - a.total);

  const funnel = funnelStages.map((stage) => ({ stage, label: findStage(admissionPipeline, stage).label, count: funnelCounts[stage] }));

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
  assignedTo: string | null;
  possibleDuplicateOf: string | null;
  tags: string[];
  portfolioUrl: string | null;
  interviewAtMs: number | null;
  interviewLocation: string | null;
  rating: number | null;
  notes: LeadNote[];
  createdAtMs: number | null;
  updatedAtMs: number | null;
  followUpMs: number | null;
};

export async function getLead(id: string): Promise<LeadDetail | null> {
  await requireAdmin();
  const db = getDb();
  const [doc, noteDocs] = await Promise.all([
    db.collection("leads").doc(id).get(),
    readNotesRaw(db, id),
  ]);
  if (!doc.exists) return null;
  const x = doc.data()!;
  const notes = resolveNotes(noteDocs, x);
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
    assignedTo: x.assignedTo ?? null,
    possibleDuplicateOf: x.possibleDuplicateOf ?? null,
    tags: Array.isArray(x.tags) ? x.tags : [],
    portfolioUrl: x.portfolioUrl ?? null,
    interviewAtMs: x.interviewAt?.toMillis?.() ?? null,
    interviewLocation: x.interviewLocation ?? null,
    rating: typeof x.rating === "number" ? x.rating : null,
    notes,
    createdAtMs: x.createdAt?.toMillis?.() ?? null,
    updatedAtMs: x.updatedAt?.toMillis?.() ?? null,
    followUpMs: x.followUpDate?.toMillis?.() ?? null,
  };
}
