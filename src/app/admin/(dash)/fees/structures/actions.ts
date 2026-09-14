"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";
import { parseRupees, formatPaise } from "@/lib/money";
import { COLLECTION, netTotalPaise, toStructure } from "@/lib/feeStructures";
import { academicYearFor, listClassRoster } from "@/lib/students";
import { STUDENTS } from "@/lib/fees";
import { getPrograms, pickFrom } from "@/lib/taxonomy";
import { queueAudit, recordAudit } from "@/lib/audit";

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

type ParsedStructure = {
  name: string;
  academicYear: string;
  program: string | null;
  amountPaise: number;
  active: boolean;
};

type Parsed = { ok: true; data: ParsedStructure } | { ok: false; error: string };

async function parse(formData: FormData): Promise<Parsed> {
  const name = clean(formData.get("name"), 80);
  if (!name) return { ok: false, error: "Give the fee a name, like “Nursery — annual”." };

  const amountPaise = parseRupees(clean(formData.get("amount"), 20));
  if (amountPaise === null) return { ok: false, error: "Enter an amount like 25000 or 25000.50." };
  if (amountPaise === 0) return { ok: false, error: "A fee of zero is the same as no fee set." };

  const programs = await getPrograms();
  return {
    ok: true,
    data: {
      name,
      academicYear: clean(formData.get("academicYear"), 12) || academicYearFor(),
      program: pickFrom(programs, clean(formData.get("program"), 60)),
      amountPaise,
      active: formData.get("active") === "on",
    },
  };
}

function revalidateAll() {
  revalidatePath("/admin/fees/structures");
  revalidatePath("/admin/fees");
}

export async function createStructure(formData: FormData): Promise<ActionResult> {
  return attempt("createStructure", async () => {
    const admin = await requireAdmin();
    const parsed = await parse(formData);
    if (!parsed.ok) return fail(parsed.error);

    const db = getDb();
    const ref = db.collection(COLLECTION).doc();
    const batch = db.batch();
    batch.set(ref, {
      ...parsed.data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    queueAudit(db, batch, {
      actor: admin.email,
      action: "feeStructure.created",
      entity: { type: "feeStructure", id: ref.id },
      summary: `Created “${parsed.data.name}” at ${formatPaise(parsed.data.amountPaise)}`,
      meta: { amountPaise: parsed.data.amountPaise, academicYear: parsed.data.academicYear },
    });
    await batch.commit();

    revalidateAll();
  });
}

export async function updateStructure(formData: FormData): Promise<ActionResult> {
  return attempt("updateStructure", async () => {
    const admin = await requireAdmin();
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing fee id");
    const parsed = await parse(formData);
    if (!parsed.ok) return fail(parsed.error);

    const db = getDb();
    const batch = db.batch();
    batch.update(db.collection(COLLECTION).doc(id), {
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
    });
    queueAudit(db, batch, {
      actor: admin.email,
      action: "feeStructure.updated",
      entity: { type: "feeStructure", id },
      summary: `Updated “${parsed.data.name}” to ${formatPaise(parsed.data.amountPaise)}`,
      meta: { amountPaise: parsed.data.amountPaise },
    });
    await batch.commit();

    revalidateAll();
  });
}

export async function deleteStructure(formData: FormData): Promise<ActionResult> {
  return attempt("deleteStructure", async () => {
    const admin = await requireAdmin();
    if (admin.role !== "owner") return fail("Deleting a fee needs an owner account.");
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing fee id");

    await getDb().collection(COLLECTION).doc(id).delete();
    await recordAudit({
      actor: admin.email,
      action: "feeStructure.deleted",
      entity: { type: "feeStructure", id },
      summary: "Deleted a fee structure",
    });
    revalidateAll();
  });
}

export async function applyToClass(formData: FormData): Promise<ActionResult> {
  return attempt("applyToClass", async () => {
    const admin = await requireAdmin();
    const structureId = clean(formData.get("structureId"), 60);
    const classSection = clean(formData.get("classSection"), 60);
    if (!structureId) return fail("Missing fee id");
    if (!classSection) return fail("Pick a class first.");

    const db = getDb();
    const doc = await db.collection(COLLECTION).doc(structureId).get();
    if (!doc.exists) return fail("That fee no longer exists.");
    const structure = toStructure(doc);

    const roster = await listClassRoster(classSection);
    if (roster.length === 0) return fail(`No enrolled children in ${classSection}.`);

    const targets = roster.filter(
      (s) => s.fees.totalPaise === 0 || s.fees.structureId === structureId,
    );
    const skipped = roster.length - targets.length;
    if (targets.length === 0) {
      return fail(
        `Every child in ${classSection} already has a different fee set. Change those individually.`,
      );
    }

    const batch = db.batch();
    for (const s of targets) {
      batch.update(db.collection(STUDENTS).doc(s.id), {
        "fees.totalPaise": netTotalPaise(structure.amountPaise, s.fees.discountPaise),
        "fees.structureId": structureId,
        "fees.structureName": structure.name,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    queueAudit(db, batch, {
      actor: admin.email,
      action: "feeStructure.applied",
      entity: { type: "feeStructure", id: structureId },
      summary: `Applied “${structure.name}” (${formatPaise(structure.amountPaise)}) to ${classSection} — ${targets.length} set, ${skipped} skipped`,
      meta: { classSection, applied: targets.length, skipped },
    });
    await batch.commit();

    revalidateAll();
    for (const s of targets) revalidatePath(`/admin/students/${s.id}`);
  });
}
