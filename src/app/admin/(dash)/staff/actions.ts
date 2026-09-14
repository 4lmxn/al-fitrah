"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin, requireOwner } from "@/lib/adminAuth";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";
import { queueAudit } from "@/lib/audit";
import { normalizeIndianPhone } from "@/lib/phone";
import {
  COLLECTION,
  MAX_STAFF,
  needsOwnerToEdit,
  queueRoster,
  rosterFrom,
  toStaff,
  type StaffMember,
} from "@/lib/staff";

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

type Parsed = {
  name: string;
  email: string | null;
  phone: string;
  designation: string;
  status: "active" | "inactive";
  note: string | null;
};

function parse(formData: FormData): { ok: true; data: Parsed } | { ok: false; error: string } {
  const name = clean(formData.get("name"), 80);
  if (name.length < 2) return { ok: false, error: "Give the person a name." };

  const rawEmail = clean(formData.get("email"), 120).toLowerCase();
  if (rawEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rawEmail)) {
    return { ok: false, error: "That email address does not look right." };
  }

  const rawPhone = clean(formData.get("phone"), 20);
  if (rawPhone && !normalizeIndianPhone(rawPhone)) {
    return { ok: false, error: "That phone number does not look right." };
  }

  return {
    ok: true,
    data: {
      name,
      email: rawEmail || null,
      phone: rawPhone,
      designation: clean(formData.get("designation"), 60),
      status: clean(formData.get("status"), 10) === "inactive" ? "inactive" : "active",
      note: clean(formData.get("note"), 500) || null,
    },
  };
}

async function rosterAfter(mutate: (all: StaffMember[]) => StaffMember[]): Promise<ReturnType<typeof rosterFrom>> {
  const snap = await getDb().collection(COLLECTION).limit(MAX_STAFF).get();
  return rosterFrom(mutate(snap.docs.map(toStaff)));
}

export async function createStaff(formData: FormData): Promise<ActionResult> {
  return attempt("createStaff", async () => {
    const admin = await requireAdmin();
    const parsed = parse(formData);
    if (!parsed.ok) return fail(parsed.error);

    const db = getDb();
    if (parsed.data.email) {
      const clash = await db.collection(COLLECTION).where("email", "==", parsed.data.email).limit(1).get();
      if (!clash.empty) return fail("Someone with that email is already on the staff list.");
    }

    const count = await db.collection(COLLECTION).count().get();
    if (count.data().count >= MAX_STAFF) return fail("The staff list is full.");

    const ref = db.collection(COLLECTION).doc();
    const batch = db.batch();
    batch.set(ref, {
      ...parsed.data,
      role: "staff",
      access: false,
      joinedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    queueAudit(db, batch, {
      actor: admin.email,
      action: "staff.created",
      entity: { type: "staff", id: ref.id },
      summary: `Added ${parsed.data.name}${parsed.data.designation ? ` (${parsed.data.designation})` : ""}`,
      meta: { hasEmail: Boolean(parsed.data.email) },
    });
    await batch.commit();

    revalidatePath("/admin/staff");
  });
}

export async function updateStaff(formData: FormData): Promise<ActionResult> {
  return attempt("updateStaff", async () => {
    const admin = await requireAdmin();
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing staff id");
    const parsed = parse(formData);
    if (!parsed.ok) return fail(parsed.error);

    const db = getDb();
    const ref = db.collection(COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return fail("That person is no longer on the staff list.");
    const before = toStaff(doc);

    if (needsOwnerToEdit(before, parsed.data.email) && admin.role !== "owner") {
      return fail("Only an owner can edit a record that controls who signs in.");
    }

    if (parsed.data.email && parsed.data.email !== before.email) {
      const clash = await db.collection(COLLECTION).where("email", "==", parsed.data.email).limit(1).get();
      if (!clash.empty && clash.docs[0].id !== id) {
        return fail("Someone with that email is already on the staff list.");
      }
    }

    const after: StaffMember = { ...before, ...parsed.data };
    const roster = await rosterAfter((all) => all.map((m) => (m.id === id ? after : m)));

    const batch = db.batch();
    batch.update(ref, { ...parsed.data, updatedAt: FieldValue.serverTimestamp() });
    queueRoster(db, batch, roster);
    queueAudit(db, batch, {
      actor: admin.email,
      action: "staff.updated",
      entity: { type: "staff", id },
      summary: `Updated ${parsed.data.name}`,
      meta: { status: parsed.data.status },
    });
    await batch.commit();

    revalidatePath("/admin/staff");
  });
}

export async function setStaffAccess(formData: FormData): Promise<ActionResult> {
  return attempt("setStaffAccess", async () => {
    const owner = await requireOwner();
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing staff id");

    const access = clean(formData.get("access"), 5) === "yes";
    const role = clean(formData.get("role"), 10) === "owner" ? "owner" : "staff";

    const db = getDb();
    const ref = db.collection(COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return fail("That person is no longer on the staff list.");
    const member = toStaff(doc);

    if (access && !member.email) {
      return fail("Add an email address first — sign-in is by Google account.");
    }
    if (access && member.status === "inactive") {
      return fail("Mark them active first. An inactive record never grants access.");
    }

    const after: StaffMember = { ...member, access, role };
    const roster = await rosterAfter((all) => all.map((m) => (m.id === id ? after : m)));

    if (member.access && !access && member.email === owner.email.toLowerCase()) {
      const stillOwner = roster.some((r) => r.role === "owner");
      if (!stillOwner) return fail("That would remove the last owner, including you.");
    }

    const batch = db.batch();
    batch.update(ref, { access, role, updatedAt: FieldValue.serverTimestamp() });
    queueRoster(db, batch, roster);
    queueAudit(db, batch, {
      actor: owner.email,
      action: access ? "staff.access_granted" : "staff.access_revoked",
      entity: { type: "staff", id },
      summary: access
        ? `Gave ${member.name} ${role} access to the console`
        : `Removed ${member.name}'s console access`,
      meta: { role, email: member.email ?? "" },
    });
    await batch.commit();

    revalidatePath("/admin/staff");
  });
}

export async function deleteStaff(formData: FormData): Promise<ActionResult> {
  return attempt("deleteStaff", async () => {
    const owner = await requireOwner();
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing staff id");

    const db = getDb();
    const ref = db.collection(COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return fail("That person is no longer on the staff list.");
    const member = toStaff(doc);

    const roster = await rosterAfter((all) => all.filter((m) => m.id !== id));

    const batch = db.batch();
    batch.delete(ref);
    queueRoster(db, batch, roster);
    queueAudit(db, batch, {
      actor: owner.email,
      action: "staff.deleted",
      entity: { type: "staff", id },
      summary: `Removed ${member.name} from the staff list`,
      meta: { hadAccess: member.access },
    });
    await batch.commit();

    revalidatePath("/admin/staff");
  });
}
