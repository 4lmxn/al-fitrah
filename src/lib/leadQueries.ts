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
  createdAtMs: number | null;
  followUpMs: number | null;
};

// Rows fetched per inbox page. The whole point of the change: read count is now
// a function of page size, not of how many leads the school has ever had.
export const PAGE_SIZE = 25;

// Search has no index behind it, so it scans. Bounded so a stray search can't
// turn into a full-collection read — it covers the most recent N leads, which
// is where staff actually look.
// ponytail: prefix-matching a normalised name/phone field would make this
// exact and cheap; only worth it if the school outgrows this window.
export const SEARCH_SCAN_LIMIT = 500;

// Lower bound for follow-up range queries. See api/cron/followups for why an
// upper bound alone matches every lead in the collection.
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
    createdAtMs: x.createdAt?.toMillis?.() ?? null,
    followUpMs: x.followUpDate?.toMillis?.() ?? null,
  };
}

// Newest-first within a type, optionally within a stage. Ordered by createdAt
// then document id: createdAt alone would drop rows whose timestamps tie, since
// startAfter needs a total order to resume from.
function baseQuery(type: LeadType, stage?: string, assignee?: string) {
  let q = getDb().collection("leads").where("type", "==", type);
  if (stage) q = q.where("stage", "==", stage);
  // "unassigned" is an explicit null match, which is why leadDefaults writes
  // the field rather than leaving it absent.
  if (assignee === "unassigned") q = q.where("assignedTo", "==", null);
  else if (assignee) q = q.where("assignedTo", "==", assignee);
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
  counts: Record<string, number>; // per-stage counts (unfiltered by stage)
  kpis: InboxKpis;
  attentionCount: number;
  nextCursor: string | null;
  /** Set when a search hit its scan window, so the UI can say so honestly. */
  searchTruncated: boolean;
  /** Configured stages, resolved once server-side for the client board. */
  pipeline: StageView[];
};

// Per-stage counts via aggregation queries. count() bills one read per 1000
// index entries matched, so counting a 10,000-lead pipeline costs single-digit
// reads instead of 10,000 — the difference between a flat bill and a linear one.
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

// A lead needs attention if its follow-up is overdue, or it is still new and
// untouched 48h after arriving. Both are queries now rather than a scan.
//
// The overdue query carries no stage filter because it doesn't need one:
// updateStage deletes followUpDate when a lead reaches a terminal stage, so
// admitted and lost leads are simply not in this index.
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

// Badge count: two aggregations, ~2 reads.
// ponytail: a lead that is both overdue AND untouched-new is counted twice, so
// the badge can read high by the size of that overlap. Deduplicating means
// fetching ids instead of counting them; not worth the reads for a badge, and
// the attention view itself (below) dedupes exactly, so the list is always right.
async function attentionCountOf(type: LeadType, now: number): Promise<number> {
  const { startOfToday, cutoff } = attentionBounds(now);
  const [overdue, untouched] = await Promise.all([
    overdueQuery(type, startOfToday).count().get(),
    untouchedQuery(type, cutoff).count().get(),
  ]);
  return overdue.data().count + untouched.data().count;
}

// The attention view is a to-do list, so it is fetched whole rather than paged —
// but bounded, because "everything needing attention" must never become
// "everything". Hitting the cap means the school has bigger problems than paging.
const ATTENTION_LIMIT = 100;

async function attentionRows(type: LeadType, now: number): Promise<LeadRow[]> {
  const { startOfToday, cutoff } = attentionBounds(now);
  const [overdue, untouched] = await Promise.all([
    overdueQuery(type, startOfToday).limit(ATTENTION_LIMIT).get(),
    untouchedQuery(type, cutoff).limit(ATTENTION_LIMIT).get(),
  ]);

  // A lead can satisfy both queries; key by id so it appears once.
  const byId = new Map<string, LeadRow>();
  for (const d of [...overdue.docs, ...untouched.docs]) byId.set(d.id, toRow(d));
  return [...byId.values()].sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
}

function matchesSearch(r: LeadRow, q: string): boolean {
  return [r.name, r.childName, r.phone, r.email, r.role, r.childAge]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q));
}

/**
 * One page of the inbox, plus the counts the header needs.
 *
 * Reads per call are now flat in collection size: PAGE_SIZE row reads, one
 * count() per stage, and two count()s for the attention badge — roughly 33,
 * whether the school has 200 leads or 200,000.
 */
export async function getInbox(
  type: LeadType,
  opts: { stage?: string; q?: string; attention?: boolean; cursor?: string; assignee?: string } = {},
): Promise<Inbox> {
  // Auth is enforced in the data layer, not just the admin layout: layouts
  // don't re-render on client navigation, so they are not a reliable gate.
  await requireAdmin();

  const now = Date.now();
  const q = opts.q?.trim().toLowerCase();
  // Resolved once: the counts, the KPI grouping and the client board all need
  // the same configured stage list, and it is one cached settings read.
  const pipeline = await getPipeline(type);

  // The rows and the header counts are independent queries, so they go out
  // together. Awaiting the counts first and the rows after doubled the wall
  // time of every inbox load for no reason — and a round trip to Firestore is
  // the dominant cost of this page, not the query itself.
  const rowsPromise: Promise<{ rows: LeadRow[]; nextCursor: string | null; searchTruncated: boolean }> =
    opts.attention
      ? // Cross-stage triage list — ignores the stage filter by design.
        attentionRows(type, now).then((r) => ({
          rows: q ? r.filter((row) => matchesSearch(row, q)) : r,
          nextCursor: null,
          searchTruncated: false,
        }))
      : q
        ? // No index backs substring search, so scan a bounded window of the
          // most recent leads and filter in memory. Paging a filtered scan
          // would be misleading (page 2 of an unknown total).
          baseQuery(type, opts.stage, opts.assignee)
            .limit(SEARCH_SCAN_LIMIT)
            .get()
            .then((snap) => ({
              rows: snap.docs.map(toRow).filter((r) => matchesSearch(r, q)),
              nextCursor: null,
              searchTruncated: snap.size === SEARCH_SCAN_LIMIT,
            }))
        : (() => {
            const cursor = decodeCursor(opts.cursor);
            let pageQuery = baseQuery(type, opts.stage, opts.assignee);
            if (cursor) pageQuery = pageQuery.startAfter(new Date(cursor.createdAtMs), cursor.id);
            // One extra row reveals whether another page exists, with no second
            // query and without needing a total.
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

/**
 * Marketing summary over admission leads.
 *
 * The numbers that a query can answer exactly and cheaply do come from queries:
 * the funnel from per-stage count() aggregations, and this month's total from a
 * range count(). Channel and referrer attribution needs per-document fields, so
 * it scans — bounded to the most recent window, which is the period anyone is
 * actually making decisions about. The page labels that window rather than
 * implying the table is all-time.
 */
export const INSIGHTS_SCAN_LIMIT = 500;

export async function getInsights(): Promise<Insights> {
  await requireAdmin();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartMs = monthStart.getTime();

  // The funnel follows the configured pipeline rather than a fixed list, so a
  // school that adds a stage sees it here without a deploy. "Lost" is excluded:
  // a funnel measures progress toward admission, and a lost lead did not
  // progress through the earlier stages on the way out.
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

  // Funnel is cumulative: reaching a later stage implies the earlier ones. Built
  // from exact stage counts, so it stays right regardless of the scan window.
  const funnelCounts: Record<string, number> = Object.fromEntries(funnelStages.map((s) => [s, 0]));
  for (const [stage, n] of Object.entries(counts)) {
    const idx = funnelStages.indexOf(stage);
    if (idx >= 0) for (let i = 0; i <= idx; i++) funnelCounts[funnelStages[i]] += n;
  }

  const sourceMap = new Map<string, { total: number; thisMonth: number }>();
  const referrerMap = new Map<string, { total: number; admitted: number }>();

  for (const r of recentSnap.docs.map(toRow)) {
    const isThisMonth = r.createdAtMs != null && r.createdAtMs >= monthStartMs;

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
  notes: LeadNote[];
  createdAtMs: number | null;
  updatedAtMs: number | null;
  followUpMs: number | null;
};

export async function getLead(id: string): Promise<LeadDetail | null> {
  await requireAdmin();
  const db = getDb();
  // The timeline lives in a subcollection under a known path, so it does not
  // need the parent document first — fetching them in sequence just paid for
  // two round trips where one would do. The parent's data is only needed for
  // the pre-migration fallback, which is applied after both land.
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
    notes,
    createdAtMs: x.createdAt?.toMillis?.() ?? null,
    updatedAtMs: x.updatedAt?.toMillis?.() ?? null,
    followUpMs: x.followUpDate?.toMillis?.() ?? null,
  };
}
