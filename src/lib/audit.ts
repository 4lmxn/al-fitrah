import "server-only";
import { FieldValue, type Firestore, type WriteBatch } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

export const COLLECTION = "auditLog";

export const RETENTION_DAYS = 730;

export type AuditEntity = { type: string; id: string };

export type AuditInput = {
  actor: string;
  action: string;
  entity: AuditEntity;
  summary: string;
  meta?: Record<string, string | number | boolean | null>;
};

export type AuditEntry = AuditInput & { id: string; atMs: number | null };

function expiry(): Date {
  return new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export function queueAudit(db: Firestore, batch: WriteBatch, entry: AuditInput): void {
  batch.set(db.collection(COLLECTION).doc(), {
    ...entry,
    meta: entry.meta ?? {},
    at: FieldValue.serverTimestamp(),
    expiresAt: expiry(),
  });
}

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

export async function recentActors(): Promise<string[]> {
  await requireAdmin();
  const snap = await getDb().collection(COLLECTION).orderBy("at", "desc").limit(200).get();
  return [...new Set(snap.docs.map((d) => d.data().actor).filter(Boolean))].sort();
}
