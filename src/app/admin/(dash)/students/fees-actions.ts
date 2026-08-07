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

/** Set the total fee owed for the year. Does not touch what has been paid. */
export async function setFeeTotal(formData: FormData): Promise<ActionResult> {
  return attempt("setFeeTotal", async () => {
    const admin = await requireAdmin();
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing student id");

    const totalPaise = parseRupees(clean(formData.get("total"), 20));
    if (totalPaise === null) return fail("Enter an amount like 25000 or 25000.50.");

    // Only the total is written. Merging the whole `fees` object would let a
    // stale form overwrite paidPaise with whatever it last rendered, silently
    // erasing recorded payments.
    const db = getDb();
    const batch = db.batch();
    batch.update(db.collection(STUDENTS).doc(id), {
      "fees.totalPaise": totalPaise,
      // A hand-typed total is no longer the price list's number, and saying it
      // still is would make a later "re-apply to the class" silently undo the
      // amount someone deliberately typed here.
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

    console.log(`fee total set student=${id} paise=${totalPaise} by=${admin.email}`);
    revalidatePath(`/admin/students/${id}`);
    revalidatePath("/admin/fees");
  });
}

/**
 * Put one child on a fee structure, with an optional concession.
 *
 * The amount is copied onto the student rather than referenced (see
 * lib/feeStructures for why). The discount is stored alongside it so the
 * concession survives a re-apply when the structure's amount is corrected —
 * otherwise every price revision would quietly cancel every family's discount.
 */
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
      // Written only when there is one. An empty string here would be a
      // placeholder in an indexed field, which is the pattern this codebase
      // keeps removing (cost invariant 5).
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

    console.log(`fee structure assigned student=${id} structure=${structureId} by=${admin.email}`);
    revalidatePath(`/admin/students/${id}`);
    revalidatePath("/admin/fees");
  });
}

/**
 * Record a payment.
 *
 * A transaction, for two reasons that both cost real money if skipped:
 *
 *  - the receipt number is derived from the highest already issued, so two
 *    people at the same counter would otherwise hand out the same one;
 *  - the ledger row and the cached total must land together, or the student's
 *    balance disagrees with the receipts in the parent's hand.
 *
 * The cached total uses increment() rather than a read-modify-write, so
 * concurrent payments add up instead of overwriting each other.
 */
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

      // Append-only. Corrections are a new negative row, never an edit, so the
      // ledger stays a record of what actually happened.
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

      // Money moved, so the record of who moved it commits with it.
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

    console.log(`payment recorded student=${studentId} paise=${amountPaise} by=${admin.email}`);
    revalidatePath(`/admin/students/${studentId}`);
    revalidatePath("/admin/fees");
  });
}

/**
 * Parse a date input into local midnight, or null for a deliberate clear.
 *
 * Local midnight because the buckets in lib/feeStatus compare against the
 * school's start of day. `new Date("2026-08-20")` is parsed as UTC, which in IST
 * lands at 5:30 AM on the 20th — close enough to look right in testing and
 * wrong enough to put a due date on the previous day for anyone west of us.
 */
function parseDay(raw: string): Date | null | undefined {
  const v = raw.trim();
  if (v === "clear") return null;
  if (!v) return undefined;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Set (or clear) the date the outstanding balance falls due.
 *
 * Without this every family owing anything looks identical to the console, so
 * the only available action is to message all of them on the same day — the
 * blast that teaches parents school fee reminders are safe to ignore.
 */
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

/**
 * Record that a parent said when they will pay.
 *
 * "I'll pay by next week" is the commonest reply to a fee reminder, and on
 * paper it goes in the margin of a register and is forgotten by the time next
 * week arrives. That forgotten callback is where most uncollected fees are
 * actually lost — not to refusal, but to nobody following up.
 *
 * Storing the date does two things: it silences the chase until the date passes
 * (so a parent who committed is not nagged in the meantime), and it puts them
 * at the very top of the list the morning after it does.
 */
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

/**
 * Note that a reminder went out.
 *
 * The WhatsApp message itself is sent from the staff member's own phone, so the
 * system cannot observe it. Recording the click is the only signal available,
 * and it is enough for the one job that matters: stopping a second staff member
 * messaging the same family about the same balance an hour later.
 */
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
