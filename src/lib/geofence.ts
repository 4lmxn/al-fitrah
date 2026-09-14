const EARTH_RADIUS_M = 6_371_000;

export type LatLng = { lat: number; lng: number };

export type FenceVerdict = {
  distanceM: number;
  withinFence: boolean;
  unreliable: boolean;
};

export function distanceMetres(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

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

export type CampusConfig = {
  lat: number;
  lng: number;
  radiusM: number;
  maxAccuracyM: number;
  enforce: boolean;
};

export type ReportedPosition = LatLng & { accuracyM?: number };

export type CheckInVerdict = FenceVerdict & {
  allowed: boolean;
  refusal: string | null;
  advisory: boolean;
};

const NO_POSITION: FenceVerdict = { distanceM: -1, withinFence: false, unreliable: true };

export function judgeCheckIn(
  position: ReportedPosition | null,
  campus: CampusConfig,
): CheckInVerdict {
  const verdict = position
    ? evaluateFence(position, campus, campus.radiusM, { maxAccuracyM: campus.maxAccuracyM })
    : NO_POSITION;

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
    accuracyM: accuracy === null ? undefined : Math.max(0, Math.min(accuracy, 100_000)),
  };
}

export function formatDistance(metres: number): string {
  if (metres < 0) return "an unknown distance";
  return metres < 1_000 ? `${metres} m` : `${(metres / 1_000).toFixed(1)} km`;
}
