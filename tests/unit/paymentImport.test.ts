import { describe, expect, it } from "vitest";
import {
  guessMapping,
  headersOf,
  parsePaymentCsv,
  parsePaymentDate,
  resolveRows,
  summarise,
  type ColumnMap,
} from "@/lib/paymentImport";

const MAP: ColumnMap = {
  admissionNumber: "Admission Number",
  amount: "Amount",
  reference: "Reference No",
  paidAt: "Transaction Date",
  studentName: "Student Name",
};

const CSV = `Reference No,Transaction Date,Admission Number,Student Name,Amount
DU1234567890,15/09/2026,AF-2025-0001,Yusuf Khan,25000.00
DU1234567891,15/09/2026,AF-2025-0002,Maryam Ahmed,"12,500.50"`;

describe("reading whatever the bank sends", () => {
  it("finds the header row", () => {
    expect(headersOf(CSV)).toEqual([
      "Reference No",
      "Transaction Date",
      "Admission Number",
      "Student Name",
      "Amount",
    ]);
  });

  it("guesses the columns it recognises, whatever they are punctuated like", () => {
    expect(guessMapping(["Reference No", "Txn ID", "ADMISSION NO.", "amount_paid"])).toMatchObject({
      reference: "Reference No",
      admissionNumber: "ADMISSION NO.",
      amount: "amount_paid",
    });
  });

  it("guesses nothing rather than guessing wrong", () => {
    // The office confirms the mapping; a wrong guess silently credits the wrong
    // column, so an unrecognised header must come back empty, not approximate.
    expect(guessMapping(["Col1", "Col2"])).toEqual({});
  });

  it("reads rupees, commas and quoted amounts into paise", () => {
    const { rows } = parsePaymentCsv(CSV, MAP);
    expect(rows.map((r) => r.amountPaise)).toEqual([2_500_000, 1_250_050]);
  });

  it("reads the date formats a bank actually emits", () => {
    const ist = (y: number, m: number, d: number) => new Date(y, m - 1, d).getTime();
    expect(parsePaymentDate("15/09/2026")).toBe(ist(2026, 9, 15));
    expect(parsePaymentDate("2026-09-15")).toBe(ist(2026, 9, 15));
    expect(parsePaymentDate("15-09-2026")).toBe(ist(2026, 9, 15));
    expect(parsePaymentDate("15-Sep-2026")).toBe(ist(2026, 9, 15));
    expect(parsePaymentDate("")).toBeNull();
    expect(parsePaymentDate("not a date")).toBeNull();
    expect(parsePaymentDate("31/02/2026")).toBeNull();
  });
});

describe("rows it refuses to import", () => {
  const run = (body: string) => parsePaymentCsv(`Reference No,Admission Number,Amount\n${body}`, {
    ...MAP,
    paidAt: null,
    studentName: null,
  });

  it("refuses a row with no reference, because it could never be deduplicated", () => {
    const { rows, issues } = run(`,AF-2025-0001,1000`);
    expect(rows).toHaveLength(0);
    expect(issues[0].message).toContain("duplicates");
  });

  it("refuses a reference repeated inside the same file", () => {
    const { rows, issues } = run(`DU1,AF-2025-0001,1000\nDU1,AF-2025-0002,2000`);
    expect(rows).toHaveLength(1);
    expect(issues[0].message).toContain("more than once");
  });

  it("refuses a row with no admission number rather than guessing from the name", () => {
    const { rows, issues } = run(`DU1,,1000`);
    expect(rows).toHaveLength(0);
    expect(issues[0].message).toContain("which child");
  });

  it("refuses an amount it cannot read exactly", () => {
    const { rows } = run(`DU1,AF-2025-0001,1e5\nDU2,AF-2025-0002,abc\nDU3,AF-2025-0003,-500`);
    expect(rows).toHaveLength(0);
  });

  it("refuses zero", () => {
    const { issues } = run(`DU1,AF-2025-0001,0`);
    expect(issues[0].message).toContain("zero");
  });

  it("says so when a required column was never mapped", () => {
    const { issues } = parsePaymentCsv("A,B\n1,2", { ...MAP, paidAt: null, studentName: null });
    expect(issues.map((i) => i.message).join(" ")).toContain("admissionNumber");
  });
});

describe("matching a receipt to a child", () => {
  const students = new Map([
    ["AF-2025-0001", { id: "s1", fullName: "Yusuf Khan" }],
    ["AF-2025-0002", { id: "s2", fullName: "Maryam Ahmed" }],
  ]);

  const { rows } = parsePaymentCsv(CSV, MAP);

  it("matches on admission number", () => {
    const out = resolveRows(rows, students, new Set());
    expect(out.every((r) => r.kind === "ready")).toBe(true);
  });

  it("holds back a payment whose child is not on the roll", () => {
    // Never credited to a near match: an unknown admission number is a question
    // for the office, not something to resolve by guessing.
    const out = resolveRows(rows, new Map([["AF-2025-0001", { id: "s1", fullName: "Yusuf Khan" }]]), new Set());
    expect(out.map((r) => r.kind)).toEqual(["ready", "unmatched"]);
  });

  it("skips a reference already imported, however many times the file is re-uploaded", () => {
    const out = resolveRows(rows, students, new Set(["DU1234567890"]));
    expect(out.map((r) => r.kind)).toEqual(["duplicate", "ready"]);
  });

  it("counts only what will actually be written", () => {
    const out = resolveRows(rows, students, new Set(["DU1234567890"]));
    expect(summarise(out)).toEqual({ ready: 1, duplicates: 1, unmatched: 0, totalPaise: 1_250_050 });
  });
});
