import { describe, it, expect } from "vitest";
import { staffKey, entryFrom } from "@/lib/staffAttendance";
import { judgeCheckIn } from "@/lib/geofence";

const campus = { lat: 12.8797, lng: 77.7712, radiusM: 150, maxAccuracyM: 250, enforce: true };

describe("staffKey", () => {
  // The bug this prevents: Firestore's set(merge:true) reads a dot in a map key
  // as a field-path separator, so entries["a.b@x.com"] would create a nested
  // tree of empty maps instead of one check-in.
  it("contains no dots or at-signs", () => {
    expect(staffKey("asma.k@alfitrah.com")).toBe("asma_k_alfitrah_com");
    expect(staffKey("asma.k@alfitrah.com")).not.toMatch(/[.@]/);
  });

  it("is case- and whitespace-insensitive, so one person is one key", () => {
    expect(staffKey("  Asma.K@Alfitrah.com ")).toBe(staffKey("asma.k@alfitrah.com"));
  });

  it("collapses runs of separators rather than emitting empty segments", () => {
    expect(staffKey("a..b@x.com")).toBe("a_b_x_com");
  });
});

describe("entryFrom", () => {
  it("keeps the real address, which the key has mangled", () => {
    const v = judgeCheckIn({ lat: campus.lat, lng: campus.lng, accuracyM: 12 }, campus);
    expect(entryFrom("asma.k@alfitrah.com", { lat: campus.lat, lng: campus.lng, accuracyM: 12 }, v).email)
      .toBe("asma.k@alfitrah.com");
  });

  // A register that only kept successes could not show the office that someone
  // tried to mark in from two suburbs away.
  it("records the position of a refused attempt, not just an accepted one", () => {
    const home = { lat: campus.lat + 0.05, lng: campus.lng, accuracyM: 20 };
    const v = judgeCheckIn(home, campus);
    expect(v.allowed).toBe(false);

    const entry = entryFrom("teacher@alfitrah.com", home, v);
    expect(entry.withinFence).toBe(false);
    expect(entry.distanceM).toBeGreaterThan(5_000);
    expect(entry.lat).toBe(home.lat);
  });

  it("stores nulls, not undefined, when there was no position", () => {
    const entry = entryFrom("teacher@alfitrah.com", null, judgeCheckIn(null, campus));
    // Firestore rejects an undefined field value; null is a stored absence.
    expect(entry.lat).toBeNull();
    expect(entry.lng).toBeNull();
    expect(entry.accuracyM).toBeNull();
    expect(entry.distanceM).toBe(-1);
  });
});
