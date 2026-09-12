"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";
import { getClassSections, getPrograms, pickFrom } from "@/lib/taxonomy";
import { guardianEmailsFrom, guardianPhonesFrom } from "@/lib/students";
import {
  MAX_PHOTO_BYTES,
  deleteObject,
  detectImageType,
  uploadStudentDocument,
  uploadStudentPhoto,
} from "@/lib/storage";
import {
  DOCUMENT_TYPES,
  MAX_DOCUMENTS,
  MAX_DOCUMENT_BYTES,
  addDocument,
  countDocuments,
  detectDocumentType,
  getDocument,
  removeDocument,
} from "@/lib/studentDocuments";
import { queueNote } from "@/lib/notes";
import { queueAudit, recordAudit } from "@/lib/audit";
import {
  COLLECTION,
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

    const programs = await getPrograms();
    const program: Program = pickFrom(programs, clean(formData.get("program"), 60)) ?? programs[0] ?? "";

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
      const guardians = [
        {
          name: leadData.parentName ?? leadData.name ?? "—",
          phone: leadData.phone ?? "",
          email: leadData.email ?? null,
          relationship: "Parent",
          isPrimary: true,
        },
      ];
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
        guardians,
        // Written together with guardians so a parent can sign in the moment a
        // child is enrolled, and so the two can never disagree.
        guardianPhones: guardianPhonesFrom(guardians),
        guardianEmails: guardianEmailsFrom(guardians),
        emergencyContact: null,
        medical: null,
        // Explicit zeros rather than an absent object: the dues list reads this
        // on every student, and a missing field would make "owes nothing" and
        // "not set up yet" indistinguishable.
        fees: { totalPaise: 0, paidPaise: 0 },
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

    await recordAudit({
      actor: admin.email,
      action: "student.enrolled",
      entity: { type: "student", id: studentId },
      summary: `Enrolled ${firstName} ${lastName}`.trim(),
      meta: { leadId, program },
    });
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

    const programs = await getPrograms();
    const program: Program = pickFrom(programs, clean(formData.get("program"), 60)) ?? programs[0] ?? "";

    await getDb().collection(COLLECTION).doc(id).update({
      firstName,
      lastName: clean(formData.get("lastName"), 60),
      program,
      status,
      // Constrained to the configured sections: an unrecognised value would
      // create a class the attendance register can never show.
      classSection: pickFrom(await getClassSections(), clean(formData.get("classSection"), 60)),
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

    await recordAudit({
      actor: admin.email,
      action: "student.updated",
      entity: { type: "student", id },
      summary: `Updated ${firstName}'s record`,
      meta: { status, program },
    });
    revalidatePath(`/admin/students/${id}`);
    revalidatePath("/admin/students");
  });
}

/**
 * Replace a student's photograph.
 *
 * Its own action rather than a field on updateStudent: a file upload and a form
 * of text inputs fail in different ways and at different sizes, and folding
 * them together means a rejected 3 MB photo also throws away the medical notes
 * someone just typed.
 *
 * The bytes decide the type, not the browser's claim. An uploaded file that
 * says it is a PNG but is not gets refused here rather than stored and served
 * back to an admin's browser to interpret.
 */
export async function uploadStudentPhotoAction(formData: FormData): Promise<ActionResult> {
  return attempt("uploadStudentPhoto", async () => {
    const admin = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return fail("Missing student id");

    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) return fail("Choose a photo first.");
    if (file.size > MAX_PHOTO_BYTES) return fail("Photos must be 2 MB or smaller.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = detectImageType(buffer);
    if (!sniffed) return fail("That file isn't a JPG, PNG or WebP image.");

    const { path } = await uploadStudentPhoto(id, { buffer, contentType: sniffed });

    const db = getDb();
    const batch = db.batch();
    batch.update(db.collection(COLLECTION).doc(id), {
      photoPath: path,
      updatedAt: FieldValue.serverTimestamp(),
    });
    // A child's photograph is personal data. Who attached one, and when, is
    // worth being able to answer later.
    queueAudit(db, batch, {
      actor: admin.email,
      action: "student.photo_set",
      entity: { type: "student", id },
      summary: "Photo updated",
    });
    await batch.commit();

    revalidatePath(`/admin/students/${id}`);
    return { ok: true };
  });
}

/**
 * The office adds a document to a child's record.
 *
 * Same checks as the guardian path in src/app/portal/[studentId]/actions.ts,
 * minus the rate limit — this side is already behind an allowlisted sign-in, so
 * the threat the limiter answers (an open form and a script) does not exist
 * here. Everything else stays: the caps, the sniffed type, the audit entry.
 */
export async function uploadStudentDocumentAction(formData: FormData): Promise<ActionResult> {
  return attempt("uploadStudentDocument", async () => {
    const admin = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return fail("Missing student id");

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return fail("Choose a file first.");
    if (file.size > MAX_DOCUMENT_BYTES) return fail("Files must be 8 MB or smaller.");

    const label = String(formData.get("label") ?? "").trim().slice(0, 80);
    if (!label) return fail("Give the document a name.");

    if ((await countDocuments(id)) >= MAX_DOCUMENTS) {
      return fail(`There are already ${MAX_DOCUMENTS} documents on this record. Remove one first.`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = detectDocumentType(buffer);
    if (!sniffed) return fail("That file isn't a PDF, JPG, PNG or WebP.");

    const docId = crypto.randomUUID();
    const { path } = await uploadStudentDocument(id, docId, {
      buffer,
      contentType: sniffed,
      ext: DOCUMENT_TYPES[sniffed] ?? "bin",
    });

    await addDocument(id, {
      label,
      path,
      contentType: sniffed,
      sizeBytes: file.size,
      uploadedBy: admin.email,
      uploadedByRole: "staff",
    });

    await recordAudit({
      actor: admin.email,
      action: "student.document_added",
      entity: { type: "student", id },
      summary: `Added "${label}"`,
      meta: { sizeBytes: file.size, contentType: sniffed },
    });

    revalidatePath(`/admin/students/${id}`);
    return { ok: true };
  });
}

/**
 * Remove a document from a child's record. Office only, by design — guardians
 * can add but not delete, because a school may be required to keep what it was
 * given.
 *
 * The index entry goes first and the object second, on purpose. If the object
 * delete fails afterwards, the result is a stored file nobody can reach, which
 * costs a little storage and nothing else. The other order risks a record
 * pointing at a file that is gone — a download that breaks with no explanation.
 */
export async function deleteStudentDocumentAction(formData: FormData): Promise<ActionResult> {
  return attempt("deleteStudentDocument", async () => {
    const admin = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const docId = String(formData.get("docId") ?? "");
    if (!id || !docId) return fail("Missing document");

    const doc = await getDocument(id, docId);
    if (!doc) return fail("That document is already gone.");

    await removeDocument(id, docId);
    await deleteObject(doc.path).catch((err) =>
      console.error("document object cleanup failed", doc.path, err),
    );

    // Deleting a child's document is exactly the action worth being able to
    // account for later.
    await recordAudit({
      actor: admin.email,
      action: "student.document_removed",
      entity: { type: "student", id },
      summary: `Removed "${doc.label}"`,
      meta: { uploadedBy: doc.uploadedBy, uploadedByRole: doc.uploadedByRole },
    });

    revalidatePath(`/admin/students/${id}`);
    return { ok: true };
  });
}
