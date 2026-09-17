import { describe, it, expect } from "vitest";
import {
  academicYearMonths,
  countByStatus,
  monthOf,
  recentAcademicYears,
  rollupId,
  summariseMonth,
  totalOf,
  type Rollup,
} from "@/lib/attendance";

const STATUSES = [
  { id: "present", present: true, counted: true },
  { id: "late", present: true, counted: true },
  { id: "absent", present: false, counted: true },
  { id: "holiday", present: false, counted: false },
];

const IDS = STATUSES.map((s) => s.id);

const rollup = (days: Record<string, Record<string, number>>): Rollup => ({
  month: "2026-09",
  academicYear: "2026-27",
  classSection: "Rose",
  days,
});

describe("what a register contributes to its month", () => {
  it("counts each status the register used", () => {
    const counts = countByStatus(
      { yusuf: "present", maryam: "absent", bilal: "late", zara: "present" },
      IDS,
    );
    expect(counts).toEqual({ present: 2, late: 1, absent: 1, holiday: 0 });
  });

  it("writes a zero for every configured status", () => {
    // The rollup is merged into, not replaced. A status left out of the map
    // would keep yesterday's number when a correction drops it to none — two
    // absences on a day the office then marked fully present.
    expect(Object.keys(countByStatus({ yusuf: "present" }, IDS)).sort()).toEqual(IDS.sort());
  });

  it("ignores a status that is no longer configured", () => {
    expect(countByStatus({ yusuf: "excused" }, IDS)).toEqual({
      present: 0,
      late: 0,
      absent: 0,
      holiday: 0,
    });
  });

  it("files a register under the month of its date", () => {
    expect(monthOf("2026-09-17")).toBe("2026-09");
    expect(rollupId("2026-27", "Rose", "2026-09")).toBe("2026-27_Rose_2026-09");
  });
});

describe("what a month adds up to", () => {
  it("counts present marks over counted marks, not over days", () => {
    const totals = summariseMonth(
      rollup({
        "2026-09-01": { present: 8, late: 1, absent: 1, holiday: 0 },
        "2026-09-02": { present: 9, late: 0, absent: 1, holiday: 0 },
      }),
      "2026-09",
      STATUSES,
    );
    expect(totals.counted).toBe(20);
    expect(totals.present).toBe(18);
    expect(totals.absent).toBe(2);
    expect(totals.percent).toBe(90);
    expect(totals.daysMarked).toBe(2);
  });

  it("leaves an uncounted status out of the percentage entirely", () => {
    // A holiday is not an absence. Counting it as one would show a month the
    // school was closed as a month the children did not come.
    const totals = summariseMonth(
      rollup({
        "2026-09-01": { present: 10, late: 0, absent: 0, holiday: 0 },
        "2026-09-02": { present: 0, late: 0, absent: 0, holiday: 10 },
      }),
      "2026-09",
      STATUSES,
    );
    expect(totals.counted).toBe(10);
    expect(totals.percent).toBe(100);
    expect(totals.daysMarked).toBe(1);
  });

  it("reports nothing rather than zero for a month never marked", () => {
    const totals = summariseMonth(null, "2026-12", STATUSES);
    expect(totals.percent).toBeNull();
    expect(totals.daysMarked).toBe(0);
  });

  it("re-reads a corrected day at its new value, never added to the old one", () => {
    // The live path writes days.{date}, so a second save of the same date
    // replaces that day. This is the read-side proof that nothing accumulates.
    const corrected = rollup({ "2026-09-01": { present: 10, late: 0, absent: 0, holiday: 0 } });
    expect(summariseMonth(corrected, "2026-09", STATUSES).counted).toBe(10);
  });

  it("totals a year from its months without re-deriving percentages", () => {
    const months = [
      summariseMonth(rollup({ d: { present: 9, late: 0, absent: 1, holiday: 0 } }), "2026-06", STATUSES),
      summariseMonth(rollup({ d: { present: 5, late: 0, absent: 5, holiday: 0 } }), "2026-07", STATUSES),
      summariseMonth(null, "2026-08", STATUSES),
    ];
    const year = totalOf(months);
    expect(year.counted).toBe(20);
    expect(year.present).toBe(14);
    expect(year.percent).toBe(70);
    expect(year.daysMarked).toBe(2);
  });
});

describe("the twelve months a trend view reads", () => {
  it("runs June to May, because that is when an Indian school year runs", () => {
    const months = academicYearMonths("2026-27");
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-06");
    expect(months[6]).toBe("2026-12");
    expect(months[7]).toBe("2027-01");
    expect(months[11]).toBe("2027-05");
  });

  it("offers the current academic year first, then the ones before it", () => {
    expect(recentAcademicYears(3, new Date("2026-09-17T00:00:00"))).toEqual([
      "2026-27",
      "2025-26",
      "2024-25",
    ]);
  });

  it("puts January in the year that began the previous June", () => {
    expect(recentAcademicYears(1, new Date("2027-01-05T00:00:00"))).toEqual(["2026-27"]);
  });
});
