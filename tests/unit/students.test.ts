import { describe, expect, it } from "vitest";
import { academicYearFor, nextAdmissionNumber, PAGE_SIZE, SEARCH_SCAN_LIMIT } from "@/lib/students";

describe("academicYearFor", () => {
  // The Indian school year starts in June. A naive getFullYear() would file a
  // child admitted in March under a year that hasn't begun.
  it("puts June onwards in the year that just started", () => {
    expect(academicYearFor(new Date(2026, 5, 1))).toBe("2026-27");
    expect(academicYearFor(new Date(2026, 11, 31))).toBe("2026-27");
  });

  it("puts January to May in the year that started last June", () => {
    expect(academicYearFor(new Date(2027, 0, 15))).toBe("2026-27");
    expect(academicYearFor(new Date(2027, 4, 31))).toBe("2026-27");
  });

  it("rolls over exactly at the June boundary", () => {
    expect(academicYearFor(new Date(2027, 4, 31))).toBe("2026-27");
    expect(academicYearFor(new Date(2027, 5, 1))).toBe("2027-28");
  });

  it("pads the century rollover rather than producing 2099-100", () => {
    expect(academicYearFor(new Date(2099, 6, 1))).toBe("2099-00");
    expect(academicYearFor(new Date(2105, 6, 1))).toBe("2105-06");
  });
});

describe("nextAdmissionNumber", () => {
  it("starts at 0001 for a year with no admissions", () => {
    expect(nextAdmissionNumber("2026-27", null)).toBe("AF-2026-0001");
  });

  it("increments the highest issued number", () => {
    expect(nextAdmissionNumber("2026-27", "AF-2026-0041")).toBe("AF-2026-0042");
  });

  it("zero-pads so string ordering matches numeric ordering", () => {
    // The list paginates on this field, so "AF-2026-10" sorting before
    // "AF-2026-9" would silently scramble the roll.
    const ninth = nextAdmissionNumber("2026-27", "AF-2026-0008");
    const tenth = nextAdmissionNumber("2026-27", ninth);
    expect(ninth).toBe("AF-2026-0009");
    expect(tenth).toBe("AF-2026-0010");
    expect([tenth, ninth].sort()).toEqual([ninth, tenth]);
  });

  it("keeps padding past four digits rather than truncating", () => {
    expect(nextAdmissionNumber("2026-27", "AF-2026-9999")).toBe("AF-2026-10000");
  });

  it("falls back to 0001 when the stored number is unparseable", () => {
    // Better a duplicate-looking first number than NaN in an identifier.
    expect(nextAdmissionNumber("2026-27", "AF-2026-oops")).toBe("AF-2026-0001");
  });

  it("uses the starting year of the label, not the trailing one", () => {
    expect(nextAdmissionNumber("2026-27", null).startsWith("AF-2026-")).toBe(true);
  });
});

describe("read budget ceilings", () => {
  it("bounds the student page and search scan", () => {
    expect(PAGE_SIZE).toBeLessThanOrEqual(50);
    expect(SEARCH_SCAN_LIMIT).toBeLessThanOrEqual(1000);
  });
});
