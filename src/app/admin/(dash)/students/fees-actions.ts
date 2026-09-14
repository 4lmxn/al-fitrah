"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";
import { parseRupees } from "@/lib/money";
import { PAYMENTS, STUDENTS, nextReceiptNumber, type PaymentMethod } from "@/lib/fees";
import { COLLECTION as FEE_STRUCTURES, netTotalPaise, toStructure } from "@/lib/feeStructures";
import { getPaymentMethods, pickFrom } from "@/lib/taxonomy";
import { queueAudit } from "@/lib/audit";
import { formatPaise } from "@/lib/money";

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

export async function setFeeTotal(formData: FormData): Promise<ActionResult> {
  return attempt("setFeeTotal", async () => {
    const admin = await requireAdmin();
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing student id");

    const totalPaise = parseRupees(clean(formData.get("total"), 20));
    if (totalPaise === null) return fail("Enter an amount like 25000 or 25000.50.");

    const db = getDb();
    const batch = db.batch();
    batch.update(db.collection(STUDENTS).doc(id), {
      "fees.totalPaise": totalPaise,
      "fees.structureId": FieldValue.delete(),
      "fees.structureName": FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    queueAudit(db, batch, {
      actor: admin.email,
      action: "fee.total_set",
      entity: { type: "student", id },
      summary: `Set the year's fee to ${formatPaise(totalPaise)}`,
      meta: { totalPaise },
    });
    await batch.commit();

    revalidatePath(`/admin/students/${id}`);
    revalidatePath("/admin/fees");
  });
}

export async function assignStructure(formData: FormData): Promise<ActionResult> {
  return attempt("assignStructure", async () => {
    const admin = await requireAdmin();
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing student id");

    const structureId = clean(formData.get("structureId"), 60);
    if (!structureId) return fail("Pick a fee to apply.");

    const discountRaw = clean(formData.get("discount"), 20);
    const discountPaise = discountRaw ? parseRupees(discountRaw) : 0;
    if (discountPaise === null) return fail("Enter a discount like 2000, or leave it blank.");

    const db = getDb();
    const doc = await db.collection(FEE_STRUCTURES).doc(structureId).get();
    if (!doc.exists) return fail("That fee no longer exists.");
    const structure = toStructure(doc);

    if (discountPaise > structure.amountPaise) {
      return fail(`A discount can't exceed the fee of ${formatPaise(structure.amountPaise)}.`);
    }

    const totalPaise = netTotalPaise(structure.amountPaise, discountPaise);
    const reason = clean(formData.get("discountReason"), 200);

    const batch = db.batch();
    batch.update(db.collection(STUDENTS).doc(id), {
      "fees.totalPaise": totalPaise,
      "fees.structureId": structureId,
      "fees.structureName": structure.name,
      "fees.discountPaise": discountPaise,
      ...(reason ? { "fees.discountReason": reason } : { "fees.discountReason": FieldValue.delete() }),
      updatedAt: FieldValue.serverTimestamp(),
    });
    queueAudit(db, batch, {
      actor: admin.email,
      action: "fee.structure_assigned",
      entity: { type: "student", id },
      summary: discountPaise
        ? `Put on “${structure.name}” at ${formatPaise(totalPaise)} (${formatPaise(discountPaise)} off)`
        : `Put on “${structure.name}” at ${formatPaise(totalPaise)}`,
      meta: { structureId, totalPaise, discountPaise },
    });
    await batch.commit();

    revalidatePath(`/admin/students/${id}`);
    revalidatePath("/admin/fees");
  });
}

export async function recordPayment(formData: FormData): Promise<ActionResult> {
  return attempt("recordPayment", async () => {
    const admin = await requireAdmin();
    const studentId = clean(formData.get("studentId"), 60);
    if (!studentId) return fail("Missing student id");

    const amountPaise = parseRupees(clean(formData.get("amount"), 20));
    if (amountPaise === null) return fail("Enter an amount like 5000 or 5000.50.");
    if (amountPaise === 0) return fail("A payment can't be zero.");

    const methods = await getPaymentMethods();
    const method: PaymentMethod = pickFrom(methods, clean(formData.get("method"), 40)) ?? methods[0] ?? "cash";

    const receivedRaw = clean(formData.get("receivedAt"), 20);
    let receivedAt = new Date();
    if (receivedRaw) {
      const d = new Date(`${receivedRaw}T00:00:00`);
      if (Number.isNaN(d.getTime())) return fail("That date isn't valid.");
      receivedAt = d;
    }

    const db = getDb();
    const year = receivedAt.getFullYear();
    let missing = false;

    await db.runTransaction(async (tx) => {
      const studentRef = db.collection(STUDENTS).doc(studentId);
      const student = await tx.get(studentRef);
      if (!student.exists) {
        missing = true;
        return;
      }

      const highest = await tx.get(
        db
          .collection(PAYMENTS)
          .where("receiptYear", "==", year)
          .orderBy("receiptNumber", "desc")
          .limit(1),
      );
      const receiptNumber = nextReceiptNumber(
        year,
        highest.empty ? null : (highest.docs[0].data().receiptNumber ?? null),
      );

      tx.set(db.collection(PAYMENTS).doc(), {
        receiptNumber,
        receiptYear: year,
        studentId,
        amountPaise,
        method,
        reference: clean(formData.get("reference"), 80) || null,
        note: clean(formData.get("note"), 500) || null,
        receivedAt,
        recordedBy: admin.email,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(studentRef, {
        "fees.paidPaise": FieldValue.increment(amountPaise),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(db.collection("auditLog").doc(), {
        actor: admin.email,
        action: "payment.recorded",
        entity: { type: "student", id: studentId },
        summary: `Recorded ${formatPaise(amountPaise)} by ${method} (${receiptNumber})`,
        meta: { amountPaise, method, receiptNumber },
        at: FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
      });
    });

    if (missing) return fail("That student no longer exists.");

    revalidatePath(`/admin/students/${studentId}`);
    revalidatePath("/admin/fees");
  });
}

function parseDay(raw: string): Date | null | undefined {
  const v = raw.trim();
  if (v === "clear") return null;
  if (!v) return undefined;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function setFeeDueDate(formData: FormData): Promise<ActionResult> {
  return attempt("setFeeDueDate", async () => {
    const admin = await requireAdmin();
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing student id");

    const due = parseDay(clean(formData.get("dueDate"), 20));
    if (due === undefined) return fail("Pick a due date, or choose Clear.");

    const db = getDb();
    const batch = db.batch();
    batch.update(db.collection(STUDENTS).doc(id), {
      "fees.dueDate": due,
      updatedAt: FieldValue.serverTimestamp(),
    });
    queueAudit(db, batch, {
      actor: admin.email,
      action: "fee.due_date_set",
      entity: { type: "student", id },
      summary: due ? `Fee due ${due.toLocaleDateString("en-IN")}` : "Cleared the fee due date",
      meta: { dueDateMs: due?.getTime() ?? null },
    });
    await batch.commit();

    revalidatePath(`/admin/students/${id}`);
    revalidatePath("/admin/fees");
  });
}

export async function logFeePromise(formData: FormData): Promise<ActionResult> {
  return attempt("logFeePromise", async () => {
    const admin = await requireAdmin();
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing student id");

    const promised = parseDay(clean(formData.get("promisedDate"), 20));
    if (promised === undefined) return fail("Pick the date they promised, or choose Clear.");
    const note = clean(formData.get("promiseNote"), 300) || null;

    const db = getDb();
    const batch = db.batch();
    batch.update(db.collection(STUDENTS).doc(id), {
      "fees.promisedDate": promised,
      "fees.promiseNote": promised ? note : null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    queueAudit(db, batch, {
      actor: admin.email,
      action: promised ? "fee.promise_logged" : "fee.promise_cleared",
      entity: { type: "student", id },
      summary: promised
        ? `Parent promised to pay by ${promised.toLocaleDateString("en-IN")}`
        : "Cleared the payment promise",
      meta: { promisedDateMs: promised?.getTime() ?? null, note },
    });
    await batch.commit();

    revalidatePath(`/admin/students/${id}`);
    revalidatePath("/admin/fees");
  });
}

export async function markFeeReminded(formData: FormData): Promise<ActionResult> {
  return attempt("markFeeReminded", async () => {
    const admin = await requireAdmin();
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing student id");

    const db = getDb();
    const batch = db.batch();
    batch.update(db.collection(STUDENTS).doc(id), {
      "fees.lastRemindedAt": FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    queueAudit(db, batch, {
      actor: admin.email,
      action: "fee.reminder_sent",
      entity: { type: "student", id },
      summary: "Sent a fee reminder on WhatsApp",
    });
    await batch.commit();

    revalidatePath(`/admin/students/${id}`);
    revalidatePath("/admin/fees");
  });
}
