import { describe, expect, it } from "vitest";
import { resolveFollowUp, followUpWaLink } from "@/lib/followup";

// Fixed "now" so offset maths is deterministic. Mid-month and mid-day on
// purpose: catches both month-rollover bugs and local-midnight truncation.
const NOW = new Date(2026, 7, 4, 15, 30, 0); // 4 Aug 2026, 15:30 local

describe("resolveFollowUp", () => {
  it("returns undefined when nothing was chosen", () => {
    expect(resolveFollowUp("", null, NOW)).toBeUndefined();
    expect(resolveFollowUp("   ", "", NOW)).toBeUndefined();
  });

  it("returns null for an explicit clear", () => {
    expect(resolveFollowUp("clear", null, NOW)).toBeNull();
  });

  it("adds a day offset from local midnight today, not from now", () => {
    const d = resolveFollowUp("", 7, NOW) as Date;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(11);
    // Truncated to midnight — a 15:30 base would drift the digest a day late.
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
  });

  it("rolls the offset over a month boundary", () => {
    const d = resolveFollowUp("", 30, NOW) as Date;
    expect(d.getMonth()).toBe(8); // September
    expect(d.getDate()).toBe(3);
  });

  it("ignores out-of-range and non-numeric offsets", () => {
    expect(resolveFollowUp("", 0, NOW)).toBeUndefined();
    expect(resolveFollowUp("", -5, NOW)).toBeUndefined();
    expect(resolveFollowUp("", 91, NOW)).toBeUndefined();
    expect(resolveFollowUp("", "abc", NOW)).toBeUndefined();
  });

  it("prefers a valid offset over a supplied date", () => {
    const d = resolveFollowUp("2026-12-25", 3, NOW) as Date;
    expect(d.getDate()).toBe(7);
    expect(d.getMonth()).toBe(7);
  });

  it("parses an explicit date at local midnight", () => {
    const d = resolveFollowUp("2026-12-25", null, NOW) as Date;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(11);
    expect(d.getDate()).toBe(25);
    expect(d.getHours()).toBe(0);
  });

  it("throws on an unparseable date rather than storing garbage", () => {
    expect(() => resolveFollowUp("not-a-date", null, NOW)).toThrow();
  });
});

describe("followUpWaLink", () => {
  it("prefixes 91 on bare 10-digit Indian numbers", () => {
    const link = followUpWaLink("9876543210", "Ayesha Khan");
    expect(link).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
  });

  it("leaves an already-qualified number alone", () => {
    expect(followUpWaLink("+91 98765 43210", "Ayesha")).toMatch(/wa\.me\/919876543210\?/);
  });

  it("returns null when there are no digits to dial", () => {
    expect(followUpWaLink("—", "Ayesha")).toBeNull();
  });

  it("falls back to a neutral greeting for a placeholder name", () => {
    const link = followUpWaLink("9876543210", "—") as string;
    expect(decodeURIComponent(link)).toContain("Assalamu alaikum there");
  });
});
