import { describe, expect, it } from "vitest";
import { attendanceMatrix, type Register } from "@/lib/attendance";

/**
 * The export is a register sheet, not a log: one row per child, one column per
 * day that was actually marked. An office reading it should be able to run a
 * finger across a row the way they would across the paper register.
 *
 * Two things this pins down. Days come out in calendar order however Firestore
 * returned them — `listRegisters` orders by dateKey DESCENDING, so a matrix
 * built from that order without sorting reads right-to-left. And a child with
 * no entry for a day gets an empty cell, never a guessed status: a register
 * that was never taken and a child marked present must not look the same.
 */

const STATUSES = [
  { id: "present", present: true, counted: true },
  { id: "absent", present: false, counted: true },
  { id: "holiday", present: false, counted: false },
];

const ROSTER = [
  { id: "s1", admissionNumber: "2026-001", fullName: "Aisha Khan" },
  { id: "s2", admissionNumber: "2026-002", fullName: "Bilal Ahmed" },
];

function register(dateKey: string, entries: Record<string, string>): Register {
  return {
    id: `2026-27_Nursery_${dateKey}`,
    dateKey,
    classSection: "Nursery",
    academicYear: "2026-27",
    entries,
    markedBy: "office@example.com",
    markedAtMs: null,
  };
}

// Deliberately newest-first, the order listRegisters actually returns.
const REGISTERS = [
  register("2026-09-03", { s1: "absent", s2: "present" }),
  register("2026-09-02", { s1: "present" }),
  register("2026-09-01", { s1: "present", s2: "absent" }),
];

describe("attendanceMatrix", () => {
  it("puts the days in calendar order regardless of the query order", () => {
    const { header } = attendanceMatrix(ROSTER, REGISTERS, STATUSES);
    expect(header.slice(2, 5)).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
  });

  it("names the child before the days, and the totals after", () => {
    const { header } = attendanceMatrix(ROSTER, REGISTERS, STATUSES);
    expect(header.slice(0, 2)).toEqual(["Admission no.", "Name"]);
    expect(header.slice(-4)).toEqual(["Present", "Absent", "Counted", "Attendance %"]);
  });

  it("lays a child's statuses out in the same order as the columns", () => {
    const { rows } = attendanceMatrix(ROSTER, REGISTERS, STATUSES);
    expect(rows[0].slice(0, 5)).toEqual(["2026-001", "Aisha Khan", "present", "present", "absent"]);
  });

  it("leaves a blank where a child has no entry, rather than assuming present", () => {
    const { rows } = attendanceMatrix(ROSTER, REGISTERS, STATUSES);
    // Bilal has no entry on the 2nd.
    expect(rows[1].slice(2, 5)).toEqual(["absent", "", "present"]);
  });

  it("totals only the days the child was actually marked", () => {
    const { rows } = attendanceMatrix(ROSTER, REGISTERS, STATUSES);
    expect(rows[0].slice(-4)).toEqual([2, 1, 3, 67]);
    expect(rows[1].slice(-4)).toEqual([1, 1, 2, 50]);
  });

  it("leaves the percentage blank for a child with nothing counted", () => {
    const { rows } = attendanceMatrix(
      [{ id: "s3", admissionNumber: "2026-003", fullName: "Zara Noor" }],
      REGISTERS,
      STATUSES,
    );
    expect(rows[0].slice(-4)).toEqual([0, 0, 0, ""]);
  });

  it("ignores a status the school does not count, such as a holiday", () => {
    const { rows } = attendanceMatrix(ROSTER, [register("2026-09-04", { s1: "holiday" })], STATUSES);
    expect(rows[0].slice(-4)).toEqual([0, 0, 0, ""]);
  });

  it("still lists every child when no register was taken at all", () => {
    const { header, rows } = attendanceMatrix(ROSTER, [], STATUSES);
    expect(header).toEqual(["Admission no.", "Name", "Present", "Absent", "Counted", "Attendance %"]);
    expect(rows).toHaveLength(2);
  });
});
