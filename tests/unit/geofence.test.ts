import { describe, it, expect } from "vitest";
import {
  distanceMetres,
  evaluateFence,
  judgeCheckIn,
  formatDistance,
  parseReportedPosition,
} from "@/lib/geofence";

// Sompura Gate, Sarjapura — approximate campus pin. Only the relative
// distances matter to these assertions, not the exact spot.
const campus = { lat: 12.8797, lng: 77.7712 };

describe("distanceMetres", () => {
  it("is zero for the same point", () => {
    expect(distanceMetres(campus, campus)).toBe(0);
  });

  it("matches a known separation", () => {
    // 0.01 degrees of latitude is ~1,111 m anywhere on Earth.
    const north = { lat: campus.lat + 0.01, lng: campus.lng };
    expect(distanceMetres(campus, north)).toBeGreaterThan(1_090);
    expect(distanceMetres(campus, north)).toBeLessThan(1_130);
  });

  it("is symmetric", () => {
    const other = { lat: 12.9716, lng: 77.5946 }; // Bengaluru city centre
    expect(distanceMetres(campus, other)).toBeCloseTo(distanceMetres(other, campus), 6);
  });
});

describe("evaluateFence", () => {
  it("passes a good fix inside the radius", () => {
    const v = evaluateFence({ ...campus, accuracyM: 10 }, campus, 100);
    expect(v.withinFence).toBe(true);
    expect(v.unreliable).toBe(false);
    expect(v.distanceM).toBe(0);
  });

  it("fails a fix well outside the radius", () => {
    const home = { lat: campus.lat + 0.05, lng: campus.lng, accuracyM: 10 };
    const v = evaluateFence(home, campus, 100);
    expect(v.withinFence).toBe(false);
    expect(v.distanceM).toBeGreaterThan(5_000);
  });

  it("widens the fence by the reported accuracy", () => {
    // 200 m away, 100 m fence: outside on a sharp fix, inside once the
    // browser admits it is only accurate to 150 m. A teacher standing in the
    // building with a poor indoor fix must not be marked off-site.
    const drifted = { lat: campus.lat + 0.0018, lng: campus.lng };
    expect(evaluateFence({ ...drifted, accuracyM: 5 }, campus, 100).withinFence).toBe(false);
    expect(evaluateFence({ ...drifted, accuracyM: 150 }, campus, 100).withinFence).toBe(true);
  });

  it("flags a useless fix as unreliable rather than as a pass", () => {
    const v = evaluateFence({ ...campus, accuracyM: 2_000 }, campus, 100);
    expect(v.withinFence).toBe(true); // overlaps, technically
    expect(v.unreliable).toBe(true); // but says so, so the register can too
  });

  it("treats a missing accuracy as a sharp fix", () => {
    const v = evaluateFence(campus, campus, 100);
    expect(v.withinFence).toBe(true);
    expect(v.unreliable).toBe(false);
  });
});

const enforcing = { ...campus, radiusM: 150, maxAccuracyM: 250, enforce: true };
const advisory = { ...enforcing, enforce: false };
const home = { lat: campus.lat + 0.05, lng: campus.lng, accuracyM: 20 };

describe("judgeCheckIn — enforcing", () => {
  it("allows a good fix at the campus", () => {
    const v = judgeCheckIn({ ...campus, accuracyM: 15 }, enforcing);
    expect(v.allowed).toBe(true);
    expect(v.refusal).toBeNull();
    expect(v.advisory).toBe(false);
  });

  it("refuses a check-in from home, and says how far", () => {
    const v = judgeCheckIn(home, enforcing);
    expect(v.allowed).toBe(false);
    expect(v.refusal).toMatch(/km from the campus/);
  });

  it("refuses when the browser sent no position at all", () => {
    const v = judgeCheckIn(null, enforcing);
    expect(v.allowed).toBe(false);
    expect(v.refusal).toMatch(/Allow location access/);
  });

  // The hole this closes: evaluateFence widens the fence by the reported
  // accuracy, so a claimed +/-5km "overlaps" any campus on Earth. Waving that
  // through would make accuracy the easiest thing to fake in the whole system.
  it("refuses a vague fix instead of letting it widen the fence to anywhere", () => {
    // home is ~5.5 km out, so the claimed accuracy has to exceed that before
    // the widened fence swallows it — which is exactly the point: claim enough
    // vagueness and every distance passes.
    const v = judgeCheckIn({ ...home, accuracyM: 20_000 }, enforcing);
    expect(v.withinFence).toBe(true); // technically overlaps
    expect(v.allowed).toBe(false); // and is refused anyway
    expect(v.refusal).toMatch(/reliable location fix/);
  });

  it("still allows an honest poor indoor fix inside the accuracy ceiling", () => {
    // 200 m out, 150 m fence, but the browser admits to +/-200 m: a teacher in
    // the building, not a teacher at home. Widening is what this is for.
    const drifted = { lat: campus.lat + 0.0018, lng: campus.lng, accuracyM: 200 };
    expect(judgeCheckIn(drifted, enforcing).allowed).toBe(true);
  });
});

describe("judgeCheckIn — advisory", () => {
  it("never refuses, but still measures", () => {
    const v = judgeCheckIn(home, advisory);
    expect(v.allowed).toBe(true);
    expect(v.advisory).toBe(true);
    expect(v.withinFence).toBe(false); // recorded, so the office can see it
    expect(v.distanceM).toBeGreaterThan(5_000);
  });

  it("allows a missing position rather than blocking the register", () => {
    const v = judgeCheckIn(null, advisory);
    expect(v.allowed).toBe(true);
    expect(v.refusal).toBeNull();
  });
});

describe("formatDistance", () => {
  it("uses metres below a kilometre and kilometres above", () => {
    expect(formatDistance(240)).toBe("240 m");
    expect(formatDistance(5_600)).toBe("5.6 km");
    expect(formatDistance(-1)).toBe("an unknown distance");
  });
});

describe("parseReportedPosition", () => {
  const form = (fields: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    return fd;
  };

  it("reads a well-formed position", () => {
    const p = parseReportedPosition(form({ lat: "12.8797", lng: "77.7712", accuracyM: "18" }));
    expect(p).toEqual({ lat: 12.8797, lng: 77.7712, accuracyM: 18 });
  });

  it("returns null for half a coordinate", () => {
    expect(parseReportedPosition(form({ lat: "12.8797" }))).toBeNull();
    expect(parseReportedPosition(form({}))).toBeNull();
  });

  // The one that matters: NaN survives every comparison as false, so an
  // unchecked "lat" would make haversine return NaN and refuse everyone.
  it("returns null for junk rather than letting NaN reach the maths", () => {
    expect(parseReportedPosition(form({ lat: "north", lng: "77.7" }))).toBeNull();
    expect(parseReportedPosition(form({ lat: "", lng: "77.7" }))).toBeNull();
  });

  it("rejects out-of-range coordinates", () => {
    expect(parseReportedPosition(form({ lat: "91", lng: "77.7" }))).toBeNull();
    expect(parseReportedPosition(form({ lat: "12.8", lng: "-181" }))).toBeNull();
  });

  it("clamps a nonsense accuracy instead of rejecting the position", () => {
    expect(parseReportedPosition(form({ lat: "12.8", lng: "77.7", accuracyM: "-5" }))?.accuracyM).toBe(0);
    expect(parseReportedPosition(form({ lat: "12.8", lng: "77.7", accuracyM: "9e99" }))?.accuracyM).toBe(100_000);
  });

  it("treats a missing accuracy as undefined, not zero", () => {
    expect(parseReportedPosition(form({ lat: "12.8", lng: "77.7" }))?.accuracyM).toBeUndefined();
  });
});
