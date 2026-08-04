"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { isValidStage, normalizeStage, PROGRAM_INTERESTS, type LeadType } from "@/lib/leads";
import { stageMeta } from "@/lib/stageMeta";
import { resolveFollowUp } from "@/lib/followup";
import { queueNote } from "@/lib/notes";
import { TERMINAL_STAGES } from "@/lib/attention";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";

export async function updateStage(formData: FormData): Promise<ActionResult> {
  return attempt("updateStage", async () => {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!id) return fail("Missing lead id");

  const ref = getDb().collection("leads").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return fail("Lead not found");
  const data = doc.data()!;
  const type = data.type as LeadType;
  if (!isValidStage(type, stage)) return fail("Invalid stage for this lead type");

  // No-op if unchanged, so the timeline doesn't fill with duplicate entries.
  if (normalizeStage(data.stage ?? "new") === stage) return;

  // Stage change and its timeline entry commit together: a move that isn't
  // logged leaves no record of who advanced the lead or when.
  const db = getDb();
  const batch = db.batch();
  // Reaching a terminal stage clears any pending follow-up. Nobody should be
  // chased after they've enrolled or gone elsewhere — and the inbox's overdue
  // query relies on this: because terminal leads carry no followUpDate, that
  // query needs no stage filter, which is what keeps it a cheap aggregation.
  batch.update(ref, {
    stage,
    ...(TERMINAL_STAGES.has(stage) ? { followUpDate: FieldValue.delete() } : {}),
  });
  queueNote(db, batch, id, {
    text: `Moved to ${stageMeta(stage).label}`,
    author: admin.email,
    kind: "stage",
  });
  await batch.commit();
  console.log(`stage updated id=${id} stage=${stage} by=${admin.email}`);
  // Only the detail page is revalidated. The inbox list updates itself
  // optimistically (InboxBoard), so we deliberately DON'T revalidate "/admin" —
  // that would force a full listLeads() re-read (N docs) on every stage click.
  revalidatePath(`/admin/leads/${id}`);
  });
}

// Set or clear the follow-up date. An empty value clears it (lead drops out of
// the reminder digest); a "YYYY-MM-DD" value is pinned to local midnight.
export async function setFollowUp(formData: FormData): Promise<ActionResult> {
  return attempt("setFollowUp", async () => {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("followUpDate") ?? "").trim();
  if (!id) return fail("Missing lead id");

  // Clearing DELETES the field rather than writing null. A null still occupies
  // the followUpDate index and would be swept into the digest's range query;
  // an absent field is not indexed at all. See the cron route for the full note.
  let followUpDate: Date | FieldValue = FieldValue.delete();
  if (raw) {
    const d = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(d.getTime())) return fail("Invalid follow-up date");
    followUpDate = d;
  }

  await getDb().collection("leads").doc(id).update({
    followUpDate,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`follow-up set id=${id} date=${raw || "cleared"} by=${admin.email}`);
  revalidatePath(`/admin/leads/${id}`);
  });
}

// Push the follow-up forward by N days from today (a "snooze"). Base is today,
// so snoozing an overdue lead always lands in the future.
export async function snoozeFollowUp(formData: FormData): Promise<ActionResult> {
  return attempt("snoozeFollowUp", async () => {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const days = Number(formData.get("days"));
  if (!id) return fail("Missing lead id");
  if (!Number.isFinite(days) || days <= 0 || days > 90) return fail("Invalid snooze");

  const target = new Date();
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + days);

  await getDb().collection("leads").doc(id).update({
    followUpDate: target,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`follow-up snoozed id=${id} +${days}d by=${admin.email}`);
  revalidatePath(`/admin/leads/${id}`);
  });
}

// Log what happened and schedule what's next in one submit — the loop staff
// actually run after every call. A blank note is fine if a follow-up is set,
// and vice versa; if neither is present the action is a no-op.
export async function logContact(formData: FormData): Promise<ActionResult> {
  return attempt("logContact", async () => {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  // Cap note length. The 1 MiB ceiling no longer applies now that notes are a
  // subcollection, but an unbounded textarea is still worth bounding.
  const text = String(formData.get("text") ?? "").trim().slice(0, 2000);
  if (!id) return fail("Missing lead id");

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  // Next follow-up: an explicit date, a "+N days" offset, or "clear".
  // `undefined` means the staff member didn't touch it — leave it alone.
  const nextFollowUp = resolveFollowUp(
    String(formData.get("followUpDate") ?? ""),
    formData.get("followUpDays"),
  );
  // null means an explicit "clear" — delete the field rather than writing null,
  // which would keep the lead in the digest's range query. See the cron route.
  if (nextFollowUp !== undefined) update.followUpDate = nextFollowUp ?? FieldValue.delete();

  if (!text && !("followUpDate" in update)) return; // nothing to do

  const db = getDb();
  const batch = db.batch();
  batch.update(db.collection("leads").doc(id), update);
  if (text) queueNote(db, batch, id, { text, author: admin.email, kind: "note" });
  await batch.commit();
  console.log(`contact logged id=${id} note=${text ? "y" : "n"} by=${admin.email}`);
  revalidatePath(`/admin/leads/${id}`);
  });
}

// Edit a lead's contact fields — fix a typo, or fill in the details of a
// walk-in that was logged from the front desk with only a name and number.
export async function editContact(formData: FormData): Promise<ActionResult> {
  return attempt("editContact", async () => {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Missing lead id");

  const parentName = String(formData.get("parentName") ?? "").trim().slice(0, 80);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 20);
  if (parentName.length < 2) return fail("Parent name is required");
  if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) return fail("A valid phone number is required");

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
  });
}
