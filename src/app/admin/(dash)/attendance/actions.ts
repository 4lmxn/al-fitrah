"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";
import { queueAudit } from "@/lib/audit";
import { academicYearFor } from "@/lib/students";
import { getAttendanceStatuses, getClassSections } from "@/lib/taxonomy";
import {
  COLLECTION,
  isFuture,
  registerId,
  type AttendanceStatus,
} from "@/lib/attendance";

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
    });
    queueAudit(db, batch, {
      actor: admin.email,
      action: "attendance.marked",
      entity: { type: "attendance", id },
      summary: `Marked ${classSection} for ${key}`,
      meta: { classSection, dateKey: key, children: Object.keys(entries).length },
    });
    await batch.commit();

    console.log(`register saved ${id} n=${Object.keys(entries).length} by=${admin.email}`);
    revalidatePath("/admin/attendance");
    return { ok: true as const };
  });
}
