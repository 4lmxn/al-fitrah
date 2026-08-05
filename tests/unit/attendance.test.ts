import { describe, expect, it } from "vitest";
import {
  dateKey,
  defaultStatusFor,
  isFuture,
  isWeekend,
  monthBounds,
  registerId,
  summarise,
  type Register,
} from "@/lib/attendance";

const reg = (entries: Register["entries"]): Register => ({
  id: "r",
  dateKey: "2026-08-04",
  classSection: "Rose",
  academicYear: "2026-27",
  entries,
  markedBy: null,
  markedAtMs: null,
});

describe("dateKey", () => {
  it("uses the local calendar date, not UTC", () => {
    // 4 Aug 23:30 IST is 18:00 UTC the same day, but 1 Jan 00:30 IST is
    // 31 Dec in UTC — toISOString would file that register under the wrong day,
    // and the wrong academic year.
    expect(dateKey(new Date(2026, 7, 4, 23, 30))).toBe("2026-08-04");
    expect(dateKey(new Date(2027, 0, 1, 0, 30))).toBe("2027-01-01");
  });

  it("zero-pads so keys sort chronologically as strings", () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(["2026-10-01", "2026-09-30"].sort()).toEqual(["2026-09-30", "2026-10-01"]);
  });
});

describe("registerId", () => {
  it("is derived, so re-saving a day overwrites rather than duplicating", () => {
    expect(registerId("2026-27", "Rose", "2026-08-04")).toBe("2026-27_Rose_2026-08-04");
    expect(registerId("2026-27", "Rose", "2026-08-04")).toBe(registerId("2026-27", "Rose", "2026-08-04"));
  });

  it("separates classes and years", () => {
    expect(registerId("2026-27", "Rose", "2026-08-04")).not.toBe(registerId("2026-27", "Tulip", "2026-08-04"));
    expect(registerId("2026-27", "Rose", "2026-08-04")).not.toBe(registerId("2027-28", "Rose", "2026-08-04"));
  });
});

describe("isWeekend / isFuture", () => {
  it("treats Sunday as a non-school day", () => {
    expect(isWeekend("2026-08-02")).toBe(true); // Sunday
    expect(isWeekend("2026-08-03")).toBe(false); // Monday
    expect(isWeekend("2026-08-08")).toBe(false); // Saturday — schools vary, so it stands
  });

  it("compares dates as strings without parsing", () => {
    expect(isFuture("2026-08-05", "2026-08-04")).toBe(true);
    expect(isFuture("2026-08-04", "2026-08-04")).toBe(false);
    expect(isFuture("2026-07-31", "2026-08-04")).toBe(false);
    // Cross-year, where a naive numeric comparison would break.
    expect(isFuture("2027-01-01", "2026-12-31")).toBe(true);
  });
});

describe("defaultStatusFor", () => {
  it("defaults a school day to present, so teachers mark only exceptions", () => {
    expect(defaultStatusFor("2026-08-03")).toBe("present");
  });

  it("defaults nothing on a Sunday or a future date", () => {
    // Defaulting these to present would manufacture attendance for days that
    // never happened.
    expect(defaultStatusFor("2026-08-02")).toBeNull();
    expect(defaultStatusFor("2099-01-01")).toBeNull();
  });
});

describe("summarise", () => {
  it("counts late as attendance", () => {
    const s = summarise([reg({ a: "present" }), reg({ a: "late" })], "a");
    expect(s).toMatchObject({ present: 2, absent: 0, counted: 2, percent: 100 });
  });

  it("excludes excused absences from the denominator", () => {
    // An authorised absence should neither credit attendance nor count against
    // the child — including it would push a well-behaved family under 75%.
    const s = summarise([reg({ a: "present" }), reg({ a: "excused" })], "a");
    expect(s).toMatchObject({ present: 1, counted: 1, percent: 100 });
  });

  it("counts unexcused absence against the percentage", () => {
    const s = summarise([reg({ a: "present" }), reg({ a: "absent" })], "a");
    expect(s).toMatchObject({ present: 1, absent: 1, counted: 2, percent: 50 });
  });

  it("ignores days a child has no entry for", () => {
    // A child who joined mid-month must not be marked absent for the days
    // before they existed on the register.
    const s = summarise([reg({ other: "absent" }), reg({ a: "present" })], "a");
    expect(s).toMatchObject({ counted: 1, percent: 100 });
  });

  it("returns null rather than 0% when nothing is counted", () => {
    // 0/0 shown as "0%" would read as a truancy problem for a child enrolled today.
    expect(summarise([], "a").percent).toBeNull();
    expect(summarise([reg({ a: "excused" })], "a").percent).toBeNull();
  });

  it("rounds to a whole percent", () => {
    const s = summarise([reg({ a: "present" }), reg({ a: "present" }), reg({ a: "absent" })], "a");
    expect(s.percent).toBe(67);
  });
});

describe("monthBounds", () => {
  it("covers a 31-day month", () => {
    expect(monthBounds("2026-08-04")).toEqual({ from: "2026-08-01", to: "2026-08-31" });
  });

  it("covers a 30-day month", () => {
    expect(monthBounds("2026-09-15")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });

  it("handles February in a leap year", () => {
    expect(monthBounds("2028-02-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthBounds("2026-02-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });
});
