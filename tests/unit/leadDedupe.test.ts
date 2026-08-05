import { describe, expect, it } from "vitest";
import { phoneKey, judge, DUPLICATE_WINDOW_DAYS } from "@/lib/leadDedupe";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 7, 5).getTime();

describe("phoneKey", () => {
  it("matches the same number written differently", () => {
    // The whole point: a parent types it one way on the form and the
    // receptionist another way at the desk.
    const forms = ["9876543210", "98765 43210", "+91 98765 43210", "(98765) 43210", "919876543210"];
    const keys = new Set(forms.map(phoneKey));
    expect(keys.size).toBe(1);
  });

  it("does not match different numbers", () => {
    expect(phoneKey("9876543210")).not.toBe(phoneKey("9876543211"));
  });

  it("returns null when there is nothing to key on", () => {
    expect(phoneKey("—")).toBeNull();
    expect(phoneKey("")).toBeNull();
  });
});

describe("judge", () => {
  const prior = (daysAgo: number) => ({ id: "L1", name: "Ayesha", createdAtMs: NOW - daysAgo * DAY });

  it("finds no duplicate when there is no prior lead", () => {
    expect(judge(null, NOW)).toEqual({ duplicate: false });
  });

  it("flags a recent prior enquiry", () => {
    expect(judge(prior(3), NOW)).toMatchObject({ duplicate: true, ofId: "L1", daysApart: 3 });
  });

  it("does not flag an enquiry outside the window", () => {
    // A family returning much later for a younger sibling is a NEW enquiry.
    // Flagging it would train staff to dismiss the warning.
    expect(judge(prior(DUPLICATE_WINDOW_DAYS + 1), NOW)).toEqual({ duplicate: false });
  });

  it("treats the window boundary as still a duplicate", () => {
    expect(judge(prior(DUPLICATE_WINDOW_DAYS), NOW)).toMatchObject({ duplicate: true });
  });

  it("handles a prior lead with no creation time rather than throwing", () => {
    // Imported or hand-written records may have no timestamp; the safe reading
    // is "just now", which flags it for a human instead of silently passing.
    expect(judge({ id: "L2", name: "X", createdAtMs: null }, NOW)).toMatchObject({ duplicate: true, daysApart: 0 });
  });
});
