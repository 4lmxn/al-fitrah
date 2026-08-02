"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { isValidStage, normalizeStage, stageLabel, PROGRAM_INTERESTS, type LeadType } from "@/lib/leads";

export async function updateStage(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!id) throw new Error("Missing lead id");

  const ref = getDb().collection("leads").doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Lead not found");
  const data = doc.data()!;
  const type = data.type as LeadType;
  if (!isValidStage(type, stage)) throw new Error("Invalid stage for this lead type");

  // No-op if unchanged, so the timeline doesn't fill with duplicate entries.
  if (normalizeStage(data.stage ?? "new") === stage) return;

  await ref.update({
    stage,
    // Log the move onto the shared activity timeline (kind:"stage").
    notes: FieldValue.arrayUnion({
      text: `Moved to ${stageLabel(stage)}`,
      author: admin.email,
      at: new Date(),
      kind: "stage",
    }),
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`stage updated id=${id} stage=${stage} by=${admin.email}`);
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
}

// Set or clear the follow-up date. An empty value clears it (lead drops out of
// the reminder digest); a "YYYY-MM-DD" value is pinned to local midnight.
export async function setFollowUp(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("followUpDate") ?? "").trim();
  if (!id) throw new Error("Missing lead id");

  let followUpDate: Date | null = null;
  if (raw) {
    const d = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid follow-up date");
    followUpDate = d;
  }

  await getDb().collection("leads").doc(id).update({
    followUpDate,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`follow-up set id=${id} date=${raw || "cleared"} by=${admin.email}`);
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
}

// Push the follow-up forward by N days from today (a "snooze"). Base is today,
// so snoozing an overdue lead always lands in the future.
export async function snoozeFollowUp(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const days = Number(formData.get("days"));
  if (!id) throw new Error("Missing lead id");
  if (!Number.isFinite(days) || days <= 0 || days > 90) throw new Error("Invalid snooze");

  const target = new Date();
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + days);

  await getDb().collection("leads").doc(id).update({
    followUpDate: target,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`follow-up snoozed id=${id} +${days}d by=${admin.email}`);
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
}

// Log a note and, optionally, schedule the next follow-up in one submit — the
// core "what happened + what's next" loop. A blank note is ignored; a follow-up
// date (or a +Nd quick value) is applied when present, "clear" removes it.
export async function logContact(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  // Cap note length: unbounded arrayUnion strings could bloat the lead doc
  // toward Firestore's 1 MiB document limit and brick it.
  const text = String(formData.get("text") ?? "").trim().slice(0, 2000);
  if (!id) throw new Error("Missing lead id");

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (text) {
    update.notes = FieldValue.arrayUnion({ text, author: admin.email, at: new Date(), kind: "note" });
  }

  // Next follow-up: either an explicit date, a "+N" day offset, or "clear".
  const nextRaw = String(formData.get("followUpDate") ?? "").trim();
  const offset = Number(formData.get("followUpDays"));
  if (nextRaw === "clear") {
    update.followUpDate = null;
  } else if (Number.isFinite(offset) && offset > 0 && offset <= 90) {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() + offset);
    update.followUpDate = t;
  } else if (nextRaw) {
    const d = new Date(`${nextRaw}T00:00:00`);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid follow-up date");
    update.followUpDate = d;
  }

  if (!text && !("followUpDate" in update)) return; // nothing to do

  await getDb().collection("leads").doc(id).update(update);
  console.log(`contact logged id=${id} note=${text ? "y" : "n"} by=${admin.email}`);
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
}

// Kept for compatibility — a plain note with no follow-up change.
export async function addNote(formData: FormData) {
  return logContact(formData);
}

// Edit the contact fields of a lead (fix a typo, fill in a walk-in's details).
export async function editContact(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing lead id");

  const parentName = String(formData.get("parentName") ?? "").trim().slice(0, 80);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 20);
  if (parentName.length < 2) throw new Error("Parent name is required");
  if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) throw new Error("A valid phone number is required");

  const childName = String(formData.get("childName") ?? "").trim().slice(0, 80);
  const email = String(formData.get("email") ?? "").trim().slice(0, 120);
  const programRaw = String(formData.get("programInterest") ?? "").trim();
  const programInterest = (PROGRAM_INTERESTS as readonly string[]).includes(programRaw) ? programRaw : null;

  await getDb().collection("leads").doc(id).update({
    parentName,
    childName: childName || null,
    phone,
    email: email || null,
    whatsapp: formData.get("whatsapp") === "on",
    programInterest,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`contact edited id=${id} by=${admin.email}`);
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
}
