"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { queueAudit } from "@/lib/audit";
import { formatPaise } from "@/lib/money";
import { PAYMENTS, STUDENTS, nextReceiptNumber } from "@/lib/fees";
import {
  MAX_IMPORT_ROWS,
  parsePaymentCsv,
  resolveRows,
  summarise,
  type ColumnMap,
  type ImportRow,
  type Resolution,
  type RowIssue,
} from "@/lib/paymentImport";

const CHUNK = 30;
const WRITE_BATCH = 100;

export type ImportPreview = {
  ok: true;
  committed: boolean;
  resolutions: Resolution[];
  issues: RowIssue[];
  counts: { ready: number; duplicates: number; unmatched: number; totalPaise: number };
  written?: number;
};

export type ImportFailure = { ok: false; error: string; issues: RowIssue[] };

export type ImportOutcome = ImportPreview | ImportFailure;

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

function mapFrom(formData: FormData): ColumnMap {
  return {
    admissionNumber: clean(formData.get("col_admissionNumber"), 120),
    amount: clean(formData.get("col_amount"), 120),
    reference: clean(formData.get("col_reference"), 120),
    paidAt: clean(formData.get("col_paidAt"), 120) || null,
    studentName: clean(formData.get("col_studentName"), 120) || null,
  };
}

async function csvFrom(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) return (await file.text()).slice(0, 2_000_000);
  return String(formData.get("csv") ?? "").slice(0, 2_000_000);
}

async function chunked<T>(values: string[], run: (slice: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < values.length; i += CHUNK) {
    out.push(...(await run(values.slice(i, i + CHUNK))));
  }
  return out;
}

async function resolve(rows: ImportRow[]): Promise<Resolution[]> {
  const db = getDb();

  const admissionNumbers = [...new Set(rows.map((r) => r.admissionNumber))];
  const students = await chunked(admissionNumbers, async (slice) => {
    const snap = await db.collection(STUDENTS).where("admissionNumber", "in", slice).get();
    return snap.docs.map((d) => {
      const x = d.data();
      return {
        key: String(x.admissionNumber ?? "").toUpperCase(),
        id: d.id,
        fullName: [x.firstName, x.lastName].filter(Boolean).join(" ") || x.fullName || "—",
      };
    });
  });
  const byAdmission = new Map(students.map((s) => [s.key, { id: s.id, fullName: s.fullName }]));

  const references = [...new Set(rows.map((r) => r.reference))];
  const existing = await chunked(references, async (slice) => {
    const snap = await db.collection(PAYMENTS).where("sourceRef", "in", slice).get();
    return snap.docs.map((d) => String(d.data().sourceRef));
  });

  return resolveRows(rows, byAdmission, new Set(existing));
}

export async function previewPayments(formData: FormData): Promise<ImportOutcome> {
  await requireAdmin();

  const text = await csvFrom(formData);
  if (!text.trim()) return { ok: false, error: "Attach the report, or paste it.", issues: [] };

  const { rows, issues } = parsePaymentCsv(text, mapFrom(formData));
  if (rows.length === 0) {
    return { ok: false, error: "Nothing in that file could be imported. The rows below say why.", issues };
  }

  const resolutions = await resolve(rows);
  return { ok: true, committed: false, resolutions, issues, counts: summarise(resolutions) };
}

export async function commitPayments(formData: FormData): Promise<ImportOutcome> {
  const admin = await requireAdmin();

  const text = await csvFrom(formData);
  if (!text.trim()) return { ok: false, error: "The file was lost between steps. Please upload it again.", issues: [] };

  const { rows, issues } = parsePaymentCsv(text, mapFrom(formData));
  if (rows.length === 0) {
    return { ok: false, error: "Nothing in that file could be imported.", issues };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: `That file has more than ${MAX_IMPORT_ROWS} rows.`, issues };
  }

  const resolutions = await resolve(rows);
  const ready = resolutions.filter((r): r is Extract<Resolution, { kind: "ready" }> => r.kind === "ready");
  if (ready.length === 0) {
    return { ok: true, committed: true, resolutions, issues, counts: summarise(resolutions), written: 0 };
  }

  const db = getDb();
  const year = new Date().getFullYear();
  const highest = await db
    .collection(PAYMENTS)
    .where("receiptYear", "==", year)
    .orderBy("receiptNumber", "desc")
    .limit(1)
    .get();

  let receipt = highest.empty ? null : (highest.docs[0].data().receiptNumber ?? null);
  let written = 0;

  for (let i = 0; i < ready.length; i += WRITE_BATCH) {
    const slice = ready.slice(i, i + WRITE_BATCH);
    const batch = db.batch();

    for (const item of slice) {
      receipt = nextReceiptNumber(year, receipt);
      batch.set(db.collection(PAYMENTS).doc(), {
        receiptNumber: receipt,
        receiptYear: year,
        studentId: item.studentId,
        amountPaise: item.row.amountPaise,
        method: "SBI Collect",
        reference: item.row.reference,
        sourceRef: item.row.reference,
        note: "Imported from SBI Collect report",
        receivedAt: item.row.paidAtMs ? new Date(item.row.paidAtMs) : new Date(),
        recordedBy: admin.email,
        createdAt: FieldValue.serverTimestamp(),
      });
      batch.update(db.collection(STUDENTS).doc(item.studentId), {
        "fees.paidPaise": FieldValue.increment(item.row.amountPaise),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    written += slice.length;
  }

  const counts = summarise(resolutions);
  const auditBatch = db.batch();
  queueAudit(db, auditBatch, {
    actor: admin.email,
    action: "payments.imported",
    entity: { type: "import", id: `sbicollect-${Date.now()}` },
    summary: `Imported ${written} payments totalling ${formatPaise(counts.totalPaise)} from an SBI Collect report`,
    meta: {
      written,
      duplicatesSkipped: counts.duplicates,
      unmatched: counts.unmatched,
      totalPaise: counts.totalPaise,
    },
  });
  await auditBatch.commit();

  revalidatePath("/admin/fees");
  for (const item of ready) revalidatePath(`/admin/students/${item.studentId}`);

  return { ok: true, committed: true, resolutions, issues, counts, written };
}
