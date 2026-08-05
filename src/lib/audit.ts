import "server-only";
import { FieldValue, type Firestore, type WriteBatch } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

/**
 * Audit log.
 *
 * The brief requires auditing every important action. Until now those actions
 * called console.log, which is not queryable: nobody can answer "who moved this
 * lead to Lost last month", or "what did this account change before it was
 * removed". A log you cannot query is a log you do not have.
 *
 * Append-only, like the fee ledger and for the same reason: the value of an
 * audit record is that it cannot be revised after the fact. There is no update
 * path and no delete path in this module.
 *
 * Entries are written on the SAME BATCH as the action they describe, so an
 * audited action cannot succeed while its record silently fails. That is the
 * whole point — a best-effort audit is one that is missing precisely when
 * something went wrong. Where a caller was doing a bare `.update()`, it becomes
 * a two-write batch; that costs one round trip, not two.
 */

export const COLLECTION = "auditLog";

/**
 * How long entries are kept. Firestore TTL deletes on `expiresAt`, so this is
 * enforced by the database rather than a cron job that can silently stop.
 * See docs/ops.md for enabling the policy.
 */
export const RETENTION_DAYS = 730; // two years

export type AuditEntity = { type: string; id: string };

export type AuditInput = {
  actor: string;
  /** Dotted, past tense: "lead.stage_changed", "payment.recorded". */
  action: string;
  entity: AuditEntity;
  /** One line a human reads in the log. Never a stack trace or a blob. */
  summary: string;
  /** Small structured detail — before/after values, amounts. Kept tiny. */
  meta?: Record<string, string | number | boolean | null>;
};

export type AuditEntry = AuditInput & { id: string; atMs: number | null };

function expiry(): Date {
  return new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/** Queue an audit entry onto an existing batch. Preferred: it is atomic. */
export function queueAudit(db: Firestore, batch: WriteBatch, entry: AuditInput): void {
  batch.set(db.collection(COLLECTION).doc(), {
    ...entry,
    meta: entry.meta ?? {},
    at: FieldValue.serverTimestamp(),
    expiresAt: expiry(),
  });
}

/**
 * Record an entry for an action that has no batch of its own.
 *
 * Only for actions whose own write already succeeded and cannot be joined —
 * a redirect-terminated flow, or a multi-document transaction that has already
 * committed. Prefer queueAudit.
 */
export async function recordAudit(entry: AuditInput): Promise<void> {
  const db = getDb();
  const batch = db.batch();
  queueAudit(db, batch, entry);
  await batch.commit();
}

export const PAGE_SIZE = 50;

function toEntry(d: FirebaseFirestore.QueryDocumentSnapshot): AuditEntry {
  const x = d.data();
  return {
    id: d.id,
    actor: x.actor ?? "—",
    action: x.action ?? "",
    entity: x.entity ?? { type: "", id: "" },
    summary: x.summary ?? "",
    meta: x.meta ?? {},
    atMs: x.at?.toMillis?.() ?? null,
  };
}

export type AuditPage = { entries: AuditEntry[]; nextCursor: string | null };

/**
 * Recent activity, newest first, optionally narrowed to one actor or entity.
 *
 * Paginated on `at` + document id: `at` alone has no total order, so entries
 * written in the same millisecond would be skipped or repeated at the seam —
 * the same tiebreak the leads inbox needs.
 */
export async function listAudit(
  opts: { actor?: string; entityType?: string; entityId?: string; cursor?: string } = {},
): Promise<AuditPage> {
  await requireAdmin();
  let q = getDb().collection(COLLECTION) as FirebaseFirestore.Query;
  if (opts.actor) q = q.where("actor", "==", opts.actor);
  if (opts.entityType) q = q.where("entity.type", "==", opts.entityType);
  if (opts.entityId) q = q.where("entity.id", "==", opts.entityId);
  q = q.orderBy("at", "desc").orderBy("__name__", "desc");

  const cursor = decodeCursor(opts.cursor);
  if (cursor) q = q.startAfter(new Date(cursor.atMs), cursor.id);

  const snap = await q.limit(PAGE_SIZE + 1).get();
  const entries = snap.docs.slice(0, PAGE_SIZE).map(toEntry);
  const last = entries[entries.length - 1];
  return {
    entries,
    nextCursor: snap.size > PAGE_SIZE && last?.atMs ? `${last.atMs}.${last.id}` : null,
  };
}

export function decodeCursor(raw?: string): { atMs: number; id: string } | null {
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const atMs = Number(raw.slice(0, dot));
  const id = raw.slice(dot + 1);
  return Number.isFinite(atMs) && id ? { atMs, id } : null;
}

/** Distinct actors, for the filter. Bounded — an admin list is small. */
export async function recentActors(): Promise<string[]> {
  await requireAdmin();
  const snap = await getDb().collection(COLLECTION).orderBy("at", "desc").limit(200).get();
  return [...new Set(snap.docs.map((d) => d.data().actor).filter(Boolean))].sort();
}
