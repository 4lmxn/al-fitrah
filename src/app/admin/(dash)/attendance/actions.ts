"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";
import { queueAudit, recordAudit } from "@/lib/audit";
import { academicYearFor } from "@/lib/students";
import { getAttendanceStatuses, getClassSections } from "@/lib/taxonomy";
import { getSettings } from "@/lib/settings";
import {
  judgeCheckIn,
  parseReportedPosition,
  type CheckInVerdict,
  type ReportedPosition,
} from "@/lib/geofence";
import {
  COLLECTION as STAFF,
  entryFrom,
  staffKey,
} from "@/lib/staffAttendance";
import {
  COLLECTION,
  ROLLUPS,
  countByStatus,
  dateKey,
  isFuture,
  monthOf,
  registerId,
  rollupId,
  type AttendanceStatus,
} from "@/lib/attendance";

async function fence(
  formData: FormData,
  actor: string,
  action: string,
  summary: string,
): Promise<{ position: ReportedPosition | null; verdict: CheckInVerdict; refusal: string | null }> {
  const campus = (await getSettings()).attendance.campus;
  const position = parseReportedPosition(formData);
  const verdict = judgeCheckIn(position, campus);

  if (!verdict.allowed) {
    await recordAudit({
      actor,
      action: `${action}.blocked`,
      entity: { type: "staff", id: actor },
      summary,
      meta: {
        distanceM: verdict.distanceM,
        accuracyM: position?.accuracyM ?? null,
        lat: position?.lat ?? null,
        lng: position?.lng ?? null,
        unreliable: verdict.unreliable,
      },
    });
    console.warn(`fence refused ${action} by=${actor} distance=${verdict.distanceM}m`);
  }
  return { position, verdict, refusal: verdict.refusal };
}

export async function checkIn(formData: FormData): Promise<ActionResult> {
  return attempt("checkIn", async () => {
    const admin = await requireAdmin();
    const key = dateKey();
    const { position, verdict, refusal } = await fence(
      formData,
      admin.email,
      "staff.checkin",
      `Refused check-in for ${key}`,
    );
    if (refusal) return fail(refusal);

    const db = getDb();
    const ref = db.collection(STAFF).doc(key);
    const slug = staffKey(admin.email);

    const existing = await ref.get();
    if (existing.data()?.entries?.[slug]) {
      return fail("You've already checked in today.");
    }

    await ref.set(
      {
        dateKey: key,
        entries: { [slug]: { ...entryFrom(admin.email, position, verdict), at: FieldValue.serverTimestamp() } },
      },
      { merge: true },
    );

    await recordAudit({
      actor: admin.email,
      action: "staff.checkin",
      entity: { type: "staff", id: admin.email },
      summary: `Checked in for ${key}${verdict.advisory ? " (fence advisory)" : ""}`,
      meta: { distanceM: verdict.distanceM, withinFence: verdict.withinFence, advisory: verdict.advisory },
    });

    revalidatePath("/admin/attendance");
  });
}

export async function saveRegister(formData: FormData): Promise<ActionResult> {
  return attempt("saveRegister", async () => {
    const admin = await requireAdmin();

    const classSection = String(formData.get("classSection") ?? "");
    if (!(await getClassSections()).includes(classSection)) {
      return fail("Pick a class before saving.");
    }

    const key = String(formData.get("dateKey") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return fail("That date isn't valid.");
    if (isFuture(key)) return fail("You can't mark attendance for a future date.");

    const { verdict, refusal } = await fence(
      formData,
      admin.email,
      "attendance.marked",
      `Refused register for ${classSection} on ${key}`,
    );
    if (refusal) return fail(refusal);

    const statuses = await getAttendanceStatuses();
    const validStatuses = new Set(statuses.map((x) => x.id));

    const entries: Record<string, AttendanceStatus> = {};
    for (const [name, value] of formData.entries()) {
      if (!name.startsWith("s:")) continue;
      const status = String(value);
      if (!validStatuses.has(status)) continue;
      entries[name.slice(2)] = status as AttendanceStatus;
    }
    if (Object.keys(entries).length === 0) return fail("No children to mark in this class.");

    const academicYear = academicYearFor(new Date(`${key}T00:00:00`));
    const id = registerId(academicYear, classSection, key);

    const db = getDb();
    const batch = db.batch();
    batch.set(db.collection(COLLECTION).doc(id), {
      dateKey: key,
      classSection,
      academicYear,
      entries,
      markedBy: admin.email,
      markedAt: FieldValue.serverTimestamp(),
      markedFrom: {
        distanceM: verdict.distanceM,
        withinFence: verdict.withinFence,
        advisory: verdict.advisory,
      },
    });
    const month = monthOf(key);
    batch.set(
      db.collection(ROLLUPS).doc(rollupId(academicYear, classSection, month)),
      {
        academicYear,
        classSection,
        month,
        days: { [key]: countByStatus(entries, statuses.map((s) => s.id)) },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    queueAudit(db, batch, {
      actor: admin.email,
      action: "attendance.marked",
      entity: { type: "attendance", id },
      summary: `Marked ${classSection} for ${key}`,
      meta: {
        classSection,
        dateKey: key,
        children: Object.keys(entries).length,
        distanceM: verdict.distanceM,
        withinFence: verdict.withinFence,
      },
    });
    await batch.commit();

    revalidatePath("/admin/attendance");
    return { ok: true as const };
  });
}
