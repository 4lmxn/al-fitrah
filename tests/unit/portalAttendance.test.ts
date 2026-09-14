import { describe, it, expect } from "vitest";
import { ownDays } from "@/lib/portalQueries";
import { summarise, type Register } from "@/lib/attendance";

const STATUSES = [
  { id: "present", present: true, counted: true },
  { id: "late", present: true, counted: true },
  { id: "absent", present: false, counted: true },
  { id: "holiday", present: false, counted: false },
];

const register = (dateKey: string, entries: Record<string, string>): Register => ({
  id: `2026-27_Rose_${dateKey}`,
  dateKey,
  classSection: "Rose",
  academicYear: "2026-27",
  entries,
  markedBy: "teacher@example.com",
  markedAtMs: 0,
});

describe("what a parent is given", () => {
  const registers = [
    register("2026-09-01", { yusuf: "present", maryam: "absent", bilal: "late" }),
    register("2026-09-02", { yusuf: "absent", maryam: "present", bilal: "present" }),
    register("2026-09-03", { yusuf: "holiday", maryam: "holiday", bilal: "holiday" }),
  ];

  it("returns only the child's own days", () => {
    const days = ownDays(registers, "yusuf", STATUSES);
    const serialised = JSON.stringify(days);
    expect(serialised).not.toContain("maryam");
    expect(serialised).not.toContain("bilal");
  });

  it("drops days that do not count towards attendance", () => {
    const days = ownDays(registers, "yusuf", STATUSES);
    expect(days.map((d) => d.dateKey)).toEqual(["2026-09-02", "2026-09-01"]);
  });

  it("marks present and absent the way the summary counts them", () => {
    const days = ownDays(registers, "yusuf", STATUSES);
    const summary = summarise(registers, "yusuf", STATUSES);
    expect(days.filter((d) => d.present)).toHaveLength(summary.present);
    expect(days.filter((d) => !d.present)).toHaveLength(summary.absent);
  });

  it("counts a late arrival as present, not as a day away", () => {
    const days = ownDays(registers, "bilal", STATUSES);
    expect(days.find((d) => d.dateKey === "2026-09-01")?.present).toBe(true);
  });

  it("says nothing at all for a child with no entry that month", () => {
    expect(ownDays(registers, "nobody", STATUSES)).toEqual([]);
  });
});
