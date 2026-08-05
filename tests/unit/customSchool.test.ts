import { describe, it, expect } from "vitest";
import { mergeSettings } from "@/lib/settings/merge";
import { parseStudentCsv } from "@/lib/studentImport";
import { pickFrom } from "@/lib/taxonomy";
import { summarise, defaultStatusFor } from "@/lib/attendance";

describe("a school's own configuration drives behaviour", () => {
  const custom = mergeSettings({
    taxonomy: { programs: ["Nursery", "LKG", "UKG"], classSections: ["Sunflower", "Daisy"] },
    attendance: {
      statuses: [
        { id: "present", label: "Present", present: true, counted: true },
        { id: "absent", label: "Absent", present: false, counted: true },
        { id: "half_day", label: "Half day", present: true, counted: true },
      ],
      nonSchoolDays: [0, 6],
      lowAttendancePercent: 60,
    },
  });

  it("accepts a program this school invented and rejects the shipped ones", () => {
    expect(pickFrom(custom.taxonomy.programs, "LKG")).toBe("LKG");
    expect(pickFrom(custom.taxonomy.programs, "Pre-KG")).toBeNull();
  });

  it("validates a CSV against the school's own lists", () => {
    const csv = "firstName,guardianName,guardianPhone,program,classSection\nAmir,Sara,9876543210,LKG,Sunflower";
    const r = parseStudentCsv(csv, { programs: custom.taxonomy.programs, classSections: custom.taxonomy.classSections });
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ program: "LKG", classSection: "Sunflower" });
  });

  it("rejects a shipped program that this school does not offer", () => {
    const csv = "firstName,guardianName,guardianPhone,program\nAmir,Sara,9876543210,Pre-KG";
    const r = parseStudentCsv(csv, { programs: custom.taxonomy.programs, classSections: custom.taxonomy.classSections });
    expect(r.errors[0].message).toMatch(/not one of/);
  });

  it("counts a status the code never shipped", () => {
    const reg = { id: "r", dateKey: "d", classSection: "c", academicYear: "y", entries: { a: "half_day" }, markedBy: null, markedAtMs: null };
    expect(summarise([reg], "a", custom.attendance.statuses)).toMatchObject({ present: 1, counted: 1, percent: 100 });
  });

  it("honours a six-day week", () => {
    // Past dates on purpose: a future date returns null regardless of the day,
    // which would make this pass for the wrong reason.
    // 1 Aug 2026 is a Saturday — a school day by default, non-school here.
    expect(defaultStatusFor("2026-08-01", custom.attendance.statuses, custom.attendance.nonSchoolDays)).toBeNull();
    // 31 Jul 2026 is a Friday — a school day under both configurations.
    expect(defaultStatusFor("2026-07-31", custom.attendance.statuses, custom.attendance.nonSchoolDays)).toBe("present");
  });
});
