import { parseRupees } from "@/lib/money";
import { splitCsvLine } from "@/lib/csv";

export const MAX_IMPORT_ROWS = 300;

export type ColumnMap = {
  admissionNumber: string;
  amount: string;
  reference: string;
  paidAt: string | null;
  studentName: string | null;
};

export type ImportRow = {
  rowNumber: number;
  admissionNumber: string;
  studentName: string | null;
  amountPaise: number;
  reference: string;
  paidAtMs: number | null;
};

export type RowIssue = { rowNumber: number; message: string };

export type ParsedPayments = {
  headers: string[];
  rows: ImportRow[];
  issues: RowIssue[];
};

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const CANDIDATES: Record<keyof ColumnMap, string[]> = {
  admissionNumber: ["admissionnumber", "admissionno", "admno", "studentid", "rollnumber", "registrationnumber"],
  amount: ["amount", "amountpaid", "feeamount", "totalamount", "transactionamount", "amountinr"],
  reference: ["referenceno", "reference", "transactionreference", "dureference", "transactionid", "txnid", "orderno", "sbicollectreferenceno"],
  paidAt: ["date", "transactiondate", "paymentdate", "paidon", "valuedate", "creditdate"],
  studentName: ["studentname", "name", "nameofstudent", "candidatename", "payername"],
};

export function headersOf(text: string): string[] {
  const first = text.split(/\r?\n/).find((l) => l.trim() !== "");
  return first ? splitCsvLine(first).map((h) => h.trim()) : [];
}

export function guessMapping(headers: string[]): Partial<ColumnMap> {
  const out: Partial<ColumnMap> = {};
  for (const [field, names] of Object.entries(CANDIDATES) as [keyof ColumnMap, string[]][]) {
    const hit = headers.find((h) => names.includes(norm(h)));
    if (hit) out[field] = hit;
  }
  return out;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function parsePaymentDate(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) return local(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(v);
  if (dmy) return local(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));

  const named = /^(\d{1,2})[\s-]([A-Za-z]{3,})[\s-](\d{4})/.exec(v);
  if (named) {
    const month = MONTHS.indexOf(named[2].slice(0, 3).toLowerCase());
    if (month >= 0) return local(Number(named[3]), month + 1, Number(named[1]));
  }
  return null;
}

function local(year: number, month: number, day: number): number | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d.getTime();
}

export function parsePaymentCsv(text: string, map: ColumnMap): ParsedPayments {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const issues: RowIssue[] = [];
  const rows: ImportRow[] = [];
  if (lines.length === 0) return { headers: [], rows, issues };

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const at = (name: string | null) => (name ? headers.findIndex((h) => norm(h) === norm(name)) : -1);

  const idx = {
    admissionNumber: at(map.admissionNumber),
    amount: at(map.amount),
    reference: at(map.reference),
    paidAt: at(map.paidAt),
    studentName: at(map.studentName),
  };

  for (const field of ["admissionNumber", "amount", "reference"] as const) {
    if (idx[field] < 0) {
      issues.push({ rowNumber: 0, message: `The file has no column mapped to ${field}.` });
    }
  }
  if (issues.length > 0) return { headers, rows, issues };

  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    if (rows.length >= MAX_IMPORT_ROWS) {
      issues.push({ rowNumber, message: `Stopped at ${MAX_IMPORT_ROWS} rows. Split the file and import the rest separately.` });
      break;
    }

    const cells = splitCsvLine(lines[i]);
    const cell = (n: number) => (n >= 0 ? (cells[n] ?? "").trim() : "");

    const reference = cell(idx.reference);
    const admissionNumber = cell(idx.admissionNumber).toUpperCase();
    const rawAmount = cell(idx.amount).replace(/[₹,\s]/g, "");

    if (!reference) {
      issues.push({ rowNumber, message: "No reference number — this row cannot be checked for duplicates, so it is not imported." });
      continue;
    }
    if (seen.has(reference)) {
      issues.push({ rowNumber, message: `Reference ${reference} appears more than once in this file.` });
      continue;
    }
    if (!admissionNumber) {
      issues.push({ rowNumber, message: "No admission number — cannot tell which child this belongs to." });
      continue;
    }

    const amountPaise = parseRupees(rawAmount);
    if (amountPaise === null) {
      issues.push({ rowNumber, message: `"${cell(idx.amount)}" is not an amount this can read.` });
      continue;
    }
    if (amountPaise <= 0) {
      issues.push({ rowNumber, message: "Amount is zero or negative. Corrections are recorded by hand, not imported." });
      continue;
    }

    seen.add(reference);
    rows.push({
      rowNumber,
      admissionNumber,
      studentName: cell(idx.studentName) || null,
      amountPaise,
      reference,
      paidAtMs: parsePaymentDate(cell(idx.paidAt)),
    });
  }

  return { headers, rows, issues };
}

export type Resolution =
  | { kind: "ready"; row: ImportRow; studentId: string; studentName: string }
  | { kind: "duplicate"; row: ImportRow }
  | { kind: "unmatched"; row: ImportRow };

export function resolveRows(
  rows: ImportRow[],
  studentsByAdmission: Map<string, { id: string; fullName: string }>,
  alreadyImported: Set<string>,
): Resolution[] {
  return rows.map((row) => {
    if (alreadyImported.has(row.reference)) return { kind: "duplicate", row };
    const student = studentsByAdmission.get(row.admissionNumber.toUpperCase());
    if (!student) return { kind: "unmatched", row };
    return { kind: "ready", row, studentId: student.id, studentName: student.fullName };
  });
}

export function summarise(resolutions: Resolution[]): {
  ready: number;
  duplicates: number;
  unmatched: number;
  totalPaise: number;
} {
  return {
    ready: resolutions.filter((r) => r.kind === "ready").length,
    duplicates: resolutions.filter((r) => r.kind === "duplicate").length,
    unmatched: resolutions.filter((r) => r.kind === "unmatched").length,
    totalPaise: resolutions
      .filter((r) => r.kind === "ready")
      .reduce((sum, r) => sum + r.row.amountPaise, 0),
  };
}
