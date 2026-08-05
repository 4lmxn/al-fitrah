"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";
import { queueNote } from "@/lib/notes";
import {
  CLASS_SECTIONS,
  COLLECTION,
  PROGRAMS,
  STUDENT_STATUSES,
  academicYearFor,
  nextAdmissionNumber,
  type Program,
  type StudentStatus,
} from "@/lib/students";

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * Turn an admitted enquiry into a student record.
 *
 * Runs in a transaction because the admission number is derived from the
 * highest one already issued. Two staff admitting children at the same moment
 * would otherwise read the same highest value and mint the same number — which
 * is exactly the identifier the school uses to tell two children apart, and the
 * field the student list paginates on.
 *
 * The lead is not consumed. It stays as the record of how the family found the
 * school, which the funnel and referral reporting still count.
 */
export async function createStudentFromLead(formData: FormData): Promise<ActionResult> {
  return attempt("createStudentFromLead", async () => {
    const admin = await requireAdmin();
    const leadId = clean(formData.get("leadId"), 60);
    if (!leadId) return fail("Missing lead id");

    const firstName = clean(formData.get("firstName"), 60);
    const lastName = clean(formData.get("lastName"), 60);
    if (firstName.length < 1) return fail("The child's first name is required.");

    const programRaw = clean(formData.get("program"), 20);
    const program: Program = (PROGRAMS as readonly string[]).includes(programRaw)
      ? (programRaw as Program)
      : "Pre-KG";

    const dobRaw = clean(formData.get("dob"), 20);
    let dob: Date | null = null;
    if (dobRaw) {
      const d = new Date(`${dobRaw}T00:00:00`);
      if (Number.isNaN(d.getTime())) return fail("That date of birth isn't valid.");
      dob = d;
    }

    const db = getDb();
    const leadRef = db.collection("leads").doc(leadId);
    const year = academicYearFor();

    let studentId = "";
    let conflict: string | null = null;

    await db.runTransaction(async (tx) => {
      const lead = await tx.get(leadRef);
      if (!lead.exists) {
        conflict = "That enquiry no longer exists.";
        return;
      }

      // One student per enquiry. Without this, a double-submit or a second
      // staff member on the same lead silently creates a duplicate child.
      const existing = await tx.get(
        db.collection(COLLECTION).where("leadId", "==", leadId).limit(1),
      );
      if (!existing.empty) {
        conflict = "This enquiry has already been enrolled.";
        return;
      }

      const highest = await tx.get(
        db
          .collection(COLLECTION)
          .where("academicYear", "==", year)
          .orderBy("admissionNumber", "desc")
          .limit(1),
      );
      const admissionNumber = nextAdmissionNumber(
        year,
        highest.empty ? null : (highest.docs[0].data().admissionNumber ?? null),
      );

      const leadData = lead.data()!;
      const studentRef = db.collection(COLLECTION).doc();
      studentId = studentRef.id;

      tx.set(studentRef, {
        admissionNumber,
        firstName,
        lastName,
        ...(dob ? { dob } : {}),
        program,
        classSection: null,
        academicYear: year,
        status: "enrolled" satisfies StudentStatus,
        // Carried over from the enquiry so staff don't retype what a parent
        // already gave us. Editable on the student record afterwards.
        guardians: [
          {
            name: leadData.parentName ?? leadData.name ?? "—",
            phone: leadData.phone ?? "",
            email: leadData.email ?? null,
            relationship: "Parent",
            isPrimary: true,
          },
        ],
        emergencyContact: null,
        medical: null,
        leadId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    if (conflict) return fail(conflict);

    // Outside the transaction: the timeline entry is a nicety, and failing it
    // must not undo an enrolment that already succeeded.
    const batch = db.batch();
    queueNote(db, batch, leadId, {
      text: `Enrolled as a student (${program})`,
      author: admin.email,
      kind: "stage",
    });
    await batch.commit().catch((err) => console.error("enrolment note failed", err));

    console.log(`student created id=${studentId} lead=${leadId} by=${admin.email}`);
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/students");
    redirect(`/admin/students/${studentId}`);
  });
}

/** Edit the details a school actually keeps changing. */
export async function updateStudent(formData: FormData): Promise<ActionResult> {
  return attempt("updateStudent", async () => {
    const admin = await requireAdmin();
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing student id");

    const firstName = clean(formData.get("firstName"), 60);
    if (firstName.length < 1) return fail("The child's first name is required.");

    const statusRaw = clean(formData.get("status"), 20);
    const status: StudentStatus = (STUDENT_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as StudentStatus)
      : "enrolled";

    const programRaw = clean(formData.get("program"), 20);
    const program: Program = (PROGRAMS as readonly string[]).includes(programRaw)
      ? (programRaw as Program)
      : "Pre-KG";

    await getDb().collection(COLLECTION).doc(id).update({
      firstName,
      lastName: clean(formData.get("lastName"), 60),
      program,
      status,
      // Constrained, not free text — see CLASS_SECTIONS. An unrecognised value
      // would create a class the register can never show.
      classSection: (CLASS_SECTIONS as readonly string[]).includes(clean(formData.get("classSection"), 20))
        ? clean(formData.get("classSection"), 20)
        : null,
      emergencyContact: {
        name: clean(formData.get("emergencyName"), 80),
        phone: clean(formData.get("emergencyPhone"), 20),
        relationship: clean(formData.get("emergencyRelationship"), 40),
      },
      medical: {
        allergies: clean(formData.get("allergies"), 500),
        conditions: clean(formData.get("conditions"), 500),
        notes: clean(formData.get("medicalNotes"), 1000),
        doctorName: clean(formData.get("doctorName"), 80),
        doctorPhone: clean(formData.get("doctorPhone"), 20),
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`student updated id=${id} by=${admin.email}`);
    revalidatePath(`/admin/students/${id}`);
    revalidatePath("/admin/students");
  });
}
