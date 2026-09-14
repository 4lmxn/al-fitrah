import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { dateKey } from "@/lib/attendance";
import type { CheckInVerdict } from "@/lib/geofence";

export const COLLECTION = "staffAttendance";

export function staffKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export type CheckIn = {
  email: string;
  atMs: number | null;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  distanceM: number;
  withinFence: boolean;
  advisory: boolean;
};

export type StaffDay = {
  dateKey: string;
  entries: Record<string, CheckIn>;
};

function toCheckIn(x: FirebaseFirestore.DocumentData): CheckIn {
  return {
    email: x.email ?? "—",
    atMs: x.at?.toMillis?.() ?? (typeof x.atMs === "number" ? x.atMs : null),
    lat: typeof x.lat === "number" ? x.lat : null,
    lng: typeof x.lng === "number" ? x.lng : null,
    accuracyM: typeof x.accuracyM === "number" ? x.accuracyM : null,
    distanceM: typeof x.distanceM === "number" ? x.distanceM : -1,
    withinFence: x.withinFence === true,
    advisory: x.advisory === true,
  };
}

export async function getStaffDay(key = dateKey()): Promise<StaffDay> {
  await requireAdmin();
  const doc = await getDb().collection(COLLECTION).doc(key).get();
  const raw = (doc.data()?.entries ?? {}) as Record<string, FirebaseFirestore.DocumentData>;
  const entries: Record<string, CheckIn> = {};
  for (const [k, v] of Object.entries(raw)) entries[k] = toCheckIn(v);
  return { dateKey: key, entries };
}

export function entryFrom(
  email: string,
  position: { lat: number; lng: number; accuracyM?: number } | null,
  verdict: CheckInVerdict,
): Omit<CheckIn, "atMs"> {
  return {
    email,
    lat: position?.lat ?? null,
    lng: position?.lng ?? null,
    accuracyM: position?.accuracyM ?? null,
    distanceM: verdict.distanceM,
    withinFence: verdict.withinFence,
    advisory: verdict.advisory,
  };
}
