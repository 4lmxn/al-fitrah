import { STUDENT_STATUSES, type Program, type StudentStatus } from "@/lib/students";

export type ImportLists = { programs: string[]; classSections: string[] };

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
  unknownColumns: string[];
};

const REQUIRED_COLUMNS = ["firstname", "guardianname", "guardianphone"] as const;

const KNOWN_COLUMNS = [
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

export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
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

function feeToPaise(raw: string): number | null {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function parseDob(raw: string): string | null | undefined {
  if (!raw) return null;
  let y: number, m: number, d: number;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (iso) [, y, m, d] = iso.map(Number) as [number, number, number, number];
  else if (dmy) {
    [, d, m, y] = dmy.map(Number) as [number, number, number, number];
  } else return undefined;

  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${y}-${p(m)}-${p(d)}`;
}

export function parseStudentCsv(text: string, lists: ImportLists): ParseResult {
  const { programs: PROGRAMS, classSections: CLASS_SECTIONS } = lists;
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
    const rowNumber = i + 2;
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
