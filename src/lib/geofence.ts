/**
 * Distance and campus-fence evaluation for staff check-in.
 *
 * The distance is computed HERE, from raw coordinates, and the check-in time is
 * the server's. The client sends a position and gets judged; it never sends its
 * own verdict and never its own clock. Everything else in this file follows
 * from that one rule.
 *
 * WHAT THIS ACTUALLY DEFENDS AGAINST — worth being exact, because the feature
 * is sold as "teachers cannot mark attendance from home":
 *
 *   Stops: opening the register at home and marking yourself in. The position
 *          the browser reports is genuinely somewhere else, and the server
 *          refuses it and writes the attempt to the audit log with coordinates.
 *
 *   Does not stop: someone who opens devtools and overrides the geolocation
 *          sensor, or runs the browser with a mocked location. Browser
 *          geolocation is client-supplied and there is no version of this that
 *          survives a determined spoofer.
 *
 * That is a real control against casual abuse by ordinary staff, and it leaves
 * evidence either way. It is not proof of presence. If it ever needs to be,
 * the next rung is a native app reading the campus wifi BSSID, or a rotating
 * code posted in the staff room — both of which move the secret off the client.
 */

const EARTH_RADIUS_M = 6_371_000;

export type LatLng = { lat: number; lng: number };

export type FenceVerdict = {
  distanceM: number;
  withinFence: boolean;
  /** Accuracy was so poor the verdict is not worth acting on. */
  unreliable: boolean;
};

/** Great-circle distance in metres. */
export function distanceMetres(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  // Haversine. Chosen over the cheaper equirectangular approximation because
  // the cost difference is meaningless at this call volume and haversine has
  // no latitude-dependent error to explain away later.
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Judge a reported position against the campus.
 *
 * `accuracyM` is the radius the browser itself reports. Indoors it is routinely
 * 50-100 m and can be far worse, which is exactly where teachers stand when
 * they mark attendance. So the fence is widened by the reported accuracy rather
 * than compared against a hard edge: a teacher genuinely inside the building
 * with a poor fix is not marked off-site for it.
 *
 * `unreliable` is a separate signal from `withinFence` on purpose. A position
 * accurate to ±2 km technically "overlaps" any campus, and reporting that as a
 * clean pass would be dishonest — it is a non-answer, and the register should
 * say so rather than quietly count it as present.
 */
export function evaluateFence(
  position: LatLng & { accuracyM?: number },
  campus: LatLng,
  radiusM: number,
  opts: { maxAccuracyM?: number } = {},
): FenceVerdict {
  const accuracyM = Math.max(0, position.accuracyM ?? 0);
  const maxAccuracyM = opts.maxAccuracyM ?? 250;
  const distanceM = Math.round(distanceMetres(position, campus));
  return {
    distanceM,
    withinFence: distanceM <= radiusM + accuracyM,
    unreliable: accuracyM > maxAccuracyM,
  };
}

/** The campus, as stored in settings. */
export type CampusConfig = {
  lat: number;
  lng: number;
  radiusM: number;
  maxAccuracyM: number;
  enforce: boolean;
};

/** What the browser sent us, or nothing if it refused or has no sensor. */
export type ReportedPosition = LatLng & { accuracyM?: number };

export type CheckInVerdict = FenceVerdict & {
  allowed: boolean;
  /** Why it was refused, in words a teacher can act on. Null when allowed. */
  refusal: string | null;
  /** True when the fence was consulted but not enforced. */
  advisory: boolean;
};

/** Verdict for a check-in with no position at all — denied permission, no sensor. */
const NO_POSITION: FenceVerdict = { distanceM: -1, withinFence: false, unreliable: true };

/**
 * Decide whether a check-in may proceed.
 *
 * The single place the block lives, so staff check-in and the class register
 * cannot drift apart on what "at school" means.
 *
 * Note how `unreliable` is handled when enforcing: it is refused, not waved
 * through. evaluateFence widens the fence by the browser's own reported
 * accuracy, which is right for an honest indoor fix of ±120 m and wrong for a
 * claimed ±5 km — that would "overlap" any campus on Earth and pass. Refusing
 * the vague fix caps the widening at maxAccuracyM and closes that door. The
 * cost is a teacher deep inside the building occasionally being told to try
 * again near a window, which is a worse experience than a false pass and a
 * better outcome.
 */
export function judgeCheckIn(
  position: ReportedPosition | null,
  campus: CampusConfig,
): CheckInVerdict {
  const verdict = position
    ? evaluateFence(position, campus, campus.radiusM, { maxAccuracyM: campus.maxAccuracyM })
    : NO_POSITION;

  // Advisory mode: still measure, still record, never refuse. This is how a
  // school runs the feature for a week to confirm the pin before trusting it.
  if (!campus.enforce) {
    return { ...verdict, allowed: true, refusal: null, advisory: true };
  }

  if (!position) {
    return {
      ...verdict,
      allowed: false,
      advisory: false,
      refusal: "Location is required to mark attendance. Allow location access and try again.",
    };
  }
  if (verdict.unreliable) {
    return {
      ...verdict,
      allowed: false,
      advisory: false,
      refusal: "We couldn't get a reliable location fix. Move near a window or step outside, then try again.",
    };
  }
  if (!verdict.withinFence) {
    return {
      ...verdict,
      allowed: false,
      advisory: false,
      refusal: `You appear to be about ${formatDistance(verdict.distanceM)} from the campus. Attendance can only be marked at school.`,
    };
  }
  return { ...verdict, allowed: true, refusal: null, advisory: false };
}

/**
 * Read a reported position out of a form post.
 *
 * Everything here is attacker-controlled — it arrives as ordinary form fields —
 * so it is range-checked before it is trusted enough to do trigonometry with.
 * A NaN latitude would propagate through haversine and come out as a NaN
 * distance, which compares false against every bound and would quietly refuse
 * every honest teacher.
 *
 * Returns null rather than a partial position: half a coordinate is not a
 * location, and judgeCheckIn treats "no position" as its own case.
 */
export function parseReportedPosition(formData: FormData): ReportedPosition | null {
  const num = (name: string): number | null => {
    const raw = formData.get(name);
    if (raw === null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };
  const lat = num("lat");
  const lng = num("lng");
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const accuracy = num("accuracyM");
  return {
    lat,
    lng,
    // A negative or absurd accuracy is a broken client, not a sharp fix — clamp
    // rather than reject, and let the vagueness ceiling do the refusing.
    accuracyM: accuracy === null ? undefined : Math.max(0, Math.min(accuracy, 100_000)),
  };
}

/** Metres under a kilometre, kilometres above it. For a message, not a record. */
export function formatDistance(metres: number): string {
  if (metres < 0) return "an unknown distance";
  return metres < 1_000 ? `${metres} m` : `${(metres / 1_000).toFixed(1)} km`;
}
