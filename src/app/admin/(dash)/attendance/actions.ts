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
  dateKey,
  isFuture,
  registerId,
  type AttendanceStatus,
} from "@/lib/attendance";

/**
 * The campus fence, applied.
 *
 * One gate for both staff check-in and the class register, so the two can never
 * drift apart on what "at school" means. A refusal is written to the audit log
 * with the coordinates that caused it — the attempt is the thing worth keeping,
 * and a register that only records successes cannot show the office that
 * someone tried to mark in from home.
 */
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
    // recordAudit, not queueAudit: there is no batch to join, because the
    // action this describes is about to not happen.
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

/**
 * Record the signed-in staff member as present at the campus, today.
 *
 * The date and the time are the server's. The client supplies only a position,
 * and gets judged on it — see lib/geofence for what that does and does not
 * defend against.
 *
 * First check-in of the day wins. A second tap is reported back rather than
 * overwriting, so an 8 a.m. arrival is not quietly replaced by a 3 p.m. one.
 */
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

    // merge:true so two teachers checking in at the same moment write disjoint
    // keys instead of clobbering the day.
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

    console.log(`staff check-in ${admin.email} ${key} distance=${verdict.distanceM}m`);
    revalidatePath("/admin/attendance");
  });
}

/**
 * Save a class register for one day.
 *
 * The whole register submits at once, as one write to one document. The
 * alternative — a write per child as each toggle is tapped — would be twenty
 * writes per class per day and would still need this endpoint for correctness.
 *
 * ponytail: last submit wins for the whole day. Two teachers marking the same
 * class simultaneously would overwrite each other. Per-student field paths
 * (`entries.${id}`) would fix it; not worth the complexity while one teacher
 * owns a class, and the timestamp records who wrote last either way.
 */
export async function saveRegister(formData: FormData): Promise<ActionResult> {
  return attempt("saveRegister", async () => {
    const admin = await requireAdmin();

    const classSection = String(formData.get("classSection") ?? "");
    if (!(await getClassSections()).includes(classSection)) {
      return fail("Pick a class before saving.");
    }

    const key = String(formData.get("dateKey") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return fail("That date isn't valid.");
    // Marking tomorrow is always a mistake — usually a mistyped date — and it
    // would quietly become an absence record nobody looks at until reporting.
    if (isFuture(key)) return fail("You can't mark attendance for a future date.");

    // Same gate as staff check-in. A register marked from off-campus is the
    // exact thing the fence exists to stop, so it is not a check-in-only rule.
    const { verdict, refusal } = await fence(
      formData,
      admin.email,
      "attendance.marked",
      `Refused register for ${classSection} on ${key}`,
    );
    if (refusal) return fail(refusal);

    // Valid statuses are configuration, so a school can add "Half day".
    const validStatuses = new Set((await getAttendanceStatuses()).map((x) => x.id));

    // The form sends one field per student: `s:<studentId>` = status.
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

    // Derived id, so re-submitting corrects the day rather than adding a second
    // register for it. merge:false is deliberate — a child removed from the
    // class should leave the register, not linger from the previous save.
    const db = getDb();
    const batch = db.batch();
    batch.set(db.collection(COLLECTION).doc(id), {
      dateKey: key,
      classSection,
      academicYear,
      entries,
      markedBy: admin.email,
      markedAt: FieldValue.serverTimestamp(),
      // Where it was marked from, kept with the register itself so a disputed
      // day can be answered without joining against the audit log.
      markedFrom: {
        distanceM: verdict.distanceM,
        withinFence: verdict.withinFence,
        advisory: verdict.advisory,
      },
    });
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

    console.log(`register saved ${id} n=${Object.keys(entries).length} by=${admin.email}`);
    revalidatePath("/admin/attendance");
    return { ok: true as const };
  });
}
