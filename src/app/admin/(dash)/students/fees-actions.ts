"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";
import { parseRupees } from "@/lib/money";
import { PAYMENTS, STUDENTS, nextReceiptNumber, type PaymentMethod } from "@/lib/fees";
import { getPaymentMethods, pickFrom } from "@/lib/taxonomy";

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
    await getDb().collection(STUDENTS).doc(id).update({
      "fees.totalPaise": totalPaise,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`fee total set student=${id} paise=${totalPaise} by=${admin.email}`);
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
    });

    if (missing) return fail("That student no longer exists.");

    console.log(`payment recorded student=${studentId} paise=${amountPaise} by=${admin.email}`);
    revalidatePath(`/admin/students/${studentId}`);
    revalidatePath("/admin/fees");
  });
}
