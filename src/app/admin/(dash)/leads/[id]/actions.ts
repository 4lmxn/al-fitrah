"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { isValidStage, type LeadType } from "@/lib/leads";

export async function updateStage(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!id) throw new Error("Missing lead id");

  const ref = getDb().collection("leads").doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Lead not found");
  const type = doc.data()!.type as LeadType;
  if (!isValidStage(type, stage)) throw new Error("Invalid stage for this lead type");

  await ref.update({ stage, updatedAt: FieldValue.serverTimestamp() });
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

export async function addNote(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  // Cap note length: unbounded arrayUnion strings could bloat the lead doc
  // toward Firestore's 1 MiB document limit and brick it.
  const text = String(formData.get("text") ?? "").trim().slice(0, 2000);
  if (!id) throw new Error("Missing lead id");
  if (!text) return; // ignore empty notes

  const ref = getDb().collection("leads").doc(id);
  await ref.update({
    notes: FieldValue.arrayUnion({ text, author: admin.email, at: new Date() }),
    updatedAt: FieldValue.serverTimestamp(),
  });
  revalidatePath(`/admin/leads/${id}`);
}
