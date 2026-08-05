import { CLASS_SECTIONS, PROGRAMS, STUDENT_STATUSES, type Program, type StudentStatus } from "@/lib/students";

/**
 * CSV import for existing students.
 *
 * Until now a student could only be created from an admitted enquiry, which is
 * right for new families and useless for a school that already has 200 children
 * on its roll. Without this the CRM cannot be adopted at all — the alternative
 * is inventing 200 fake enquiries.
 *
 * Parsing is pure and separate from writing, so the admin can see exactly what
 * will happen before anything is committed. A bulk import that half-succeeds
 * and reports "done" is worse than one that refuses.
 */

export type ImportRow = {
  rowNumber: number;
  admissionNumber: string | null;
  firstName: string;
  lastName: string;
  dob: string | null;
  program: Program;
  classSection: string | null;
  status: StudentStatus;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string | null;
  feeTotalPaise: number;
};

export type RowError = { rowNumber: number; message: string };

export type ParseResult = {
  rows: ImportRow[];
  errors: RowError[];
  /** Header names present in the file that we don't recognise. */
  unknownColumns: string[];
};

export const REQUIRED_COLUMNS = ["firstname", "guardianname", "guardianphone"] as const;

export const KNOWN_COLUMNS = [
  "admissionnumber",
  "firstname",
  "lastname",
  "dob",
  "program",
  "classsection",
  "status",
  "guardianname",
  "guardianphone",
  "guardianemail",
  "feetotal",
] as const;

/**
 * Split one CSV line, honouring quoted fields.
 *
 * Written out rather than pulled from a dependency because the input is a
 * spreadsheet export, not arbitrary RFC 4180: names contain commas
 * ("Khan, Ayesha") and quotes get doubled. Those two cases are the whole
 * requirement, and both are covered by tests.
 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'; // escaped quote inside a quoted field
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const norm = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");

/** Rupees (or blank) to integer paise. Mirrors lib/money, kept dependency-free. */
function feeToPaise(raw: string): number | null {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** Accepts YYYY-MM-DD and the DD/MM/YYYY that Indian spreadsheets produce. */
export function parseDob(raw: string): string | null | undefined {
  if (!raw) return null;
  let y: number, m: number, d: number;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (iso) [, y, m, d] = iso.map(Number) as [number, number, number, number];
  else if (dmy) {
    // Day-first, not month-first: a school in India exporting 03/08/2022 means
    // 3 August. Reading it as March would put the child in the wrong intake.
    [, d, m, y] = dmy.map(Number) as [number, number, number, number];
  } else return undefined;

  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${y}-${p(m)}-${p(d)}`;
}

export function parseStudentCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { rows: [], errors: [{ rowNumber: 0, message: "The file is empty." }], unknownColumns: [] };

  const header = splitCsvLine(lines[0]).map(norm);
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) {
    return {
      rows: [],
      errors: [{ rowNumber: 1, message: `Missing required column(s): ${missing.join(", ")}. Expected a header row.` }],
      unknownColumns: [],
    };
  }

  const unknownColumns = header.filter((h) => h && !(KNOWN_COLUMNS as readonly string[]).includes(h));
  const at = (cells: string[], name: string) => {
    const i = header.indexOf(name);
    return i === -1 ? "" : (cells[i] ?? "");
  };

  const rows: ImportRow[] = [];
  const errors: RowError[] = [];
  const seenAdmission = new Set<string>();

  lines.slice(1).forEach((line, i) => {
    const rowNumber = i + 2; // 1-based, and the header is row 1
    const cells = splitCsvLine(line);

    const firstName = at(cells, "firstname");
    const guardianName = at(cells, "guardianname");
    const guardianPhone = at(cells, "guardianphone");

    if (!firstName) return errors.push({ rowNumber, message: "First name is required." });
    if (!guardianName) return errors.push({ rowNumber, message: "Guardian name is required." });
    if (!/^[0-9+\-\s()]{7,20}$/.test(guardianPhone)) {
      return errors.push({ rowNumber, message: `Guardian phone "${guardianPhone}" doesn't look like a phone number.` });
    }

    const dob = parseDob(at(cells, "dob"));
    if (dob === undefined) {
      return errors.push({ rowNumber, message: `Date of birth "${at(cells, "dob")}" isn't a date. Use YYYY-MM-DD or DD/MM/YYYY.` });
    }

    const programRaw = at(cells, "program");
    const program = (PROGRAMS as readonly string[]).find((p) => norm(p) === norm(programRaw)) as Program | undefined;
    if (programRaw && !program) {
      return errors.push({ rowNumber, message: `Program "${programRaw}" is not one of: ${PROGRAMS.join(", ")}.` });
    }

    const sectionRaw = at(cells, "classsection");
    const classSection = (CLASS_SECTIONS as readonly string[]).find((c) => norm(c) === norm(sectionRaw)) ?? null;
    if (sectionRaw && !classSection) {
      return errors.push({ rowNumber, message: `Class "${sectionRaw}" is not one of: ${CLASS_SECTIONS.join(", ")}.` });
    }

    const statusRaw = at(cells, "status");
    const status = (STUDENT_STATUSES as readonly string[]).find((s) => norm(s) === norm(statusRaw)) as StudentStatus | undefined;
    if (statusRaw && !status) {
      return errors.push({ rowNumber, message: `Status "${statusRaw}" is not one of: ${STUDENT_STATUSES.join(", ")}.` });
    }

    const feeTotalPaise = feeToPaise(at(cells, "feetotal"));
    if (feeTotalPaise === null) {
      return errors.push({ rowNumber, message: `Fee "${at(cells, "feetotal")}" isn't an amount.` });
    }

    const admissionNumber = at(cells, "admissionnumber") || null;
    // Catch duplicates inside the file itself, before they reach Firestore and
    // become two children sharing one identifier.
    if (admissionNumber) {
      if (seenAdmission.has(admissionNumber)) {
        return errors.push({ rowNumber, message: `Admission number ${admissionNumber} appears more than once in this file.` });
      }
      seenAdmission.add(admissionNumber);
    }

    rows.push({
      rowNumber,
      admissionNumber,
      firstName,
      lastName: at(cells, "lastname"),
      dob,
      program: program ?? "Pre-KG",
      classSection,
      status: status ?? "enrolled",
      guardianName,
      guardianPhone,
      guardianEmail: at(cells, "guardianemail") || null,
      feeTotalPaise,
    });
  });

  return { rows, errors, unknownColumns };
}

export const SAMPLE_CSV = `admissionNumber,firstName,lastName,dob,program,classSection,status,guardianName,guardianPhone,guardianEmail,feeTotal
AF-2025-0001,Yusuf,Khan,03/08/2022,Pre-KG,Rose,enrolled,Ayesha Khan,9876543210,ayesha@example.com,25000
,Maryam,Ahmed,2022-11-14,Junior KG,Tulip,enrolled,Bilal Ahmed,9876543211,,30000`;
