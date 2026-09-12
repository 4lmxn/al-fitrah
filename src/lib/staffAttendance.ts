import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { dateKey } from "@/lib/attendance";
import type { CheckInVerdict } from "@/lib/geofence";

/**
 * Staff check-in.
 *
 * One document per DAY, holding a staff-member → check-in map — the same shape
 * as the class register in lib/attendance, for the same reason. A dozen staff
 * over 22 school days is 22 writes a month and one read to see who is in today;
 * a document per person per day is 264 writes and a query to answer the same
 * question. The shape stays flat in headcount.
 *
 * The document id is the date, so the day is a get by id with no query, no
 * index, and no ordering to maintain.
 */

export const COLLECTION = "staffAttendance";

/**
 * Map keys are a slug of the email, not the email.
 *
 * Firestore's set(merge:true) interprets a dot inside a map key as a field-path
 * separator, so `entries["asma.k@school.com"]` would silently create a nested
 * tree of empty maps instead of one entry. The real address is stored inside
 * the entry, where nothing parses it.
 */
export function staffKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export type CheckIn = {
  email: string;
  atMs: number | null;
  /** Raw reported position. Null when the browser gave us nothing. */
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  /** Metres from the configured campus pin. -1 when there was no position. */
  distanceM: number;
  withinFence: boolean;
  /** The fence was measured but not enforced when this was recorded. */
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

/** One day's check-ins. Admin-gated: this is who was at work, not public. */
export async function getStaffDay(key = dateKey()): Promise<StaffDay> {
  await requireAdmin();
  const doc = await getDb().collection(COLLECTION).doc(key).get();
  const raw = (doc.data()?.entries ?? {}) as Record<string, FirebaseFirestore.DocumentData>;
  const entries: Record<string, CheckIn> = {};
  for (const [k, v] of Object.entries(raw)) entries[k] = toCheckIn(v);
  return { dateKey: key, entries };
}

/**
 * Build the stored entry from a verdict.
 *
 * The position is recorded whether or not it passed — a refused attempt is the
 * interesting one, and a register that only keeps successes cannot show the
 * office that someone tried to mark in from two suburbs away.
 */
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
