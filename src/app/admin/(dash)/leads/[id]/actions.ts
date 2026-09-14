"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { normalizeStage, type LeadType } from "@/lib/leads";
import { getLeadTags, getPrograms, pickFrom } from "@/lib/taxonomy";
import { isValidStage, stageLabelFor, terminalStages } from "@/lib/pipelines";
import { resolveFollowUp } from "@/lib/followup";
import { queueNote } from "@/lib/notes";
import { queueAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { listAdminEmails } from "@/lib/roles";
import { SITE_URL } from "@/lib/seo";
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
  if (!(await isValidStage(type, stage))) return fail("Invalid stage for this lead type");

  if (normalizeStage(data.stage ?? "new") === stage) return;

  const db = getDb();
  const batch = db.batch();
  batch.update(ref, {
    stage,
    ...((await terminalStages(type)).has(stage) ? { followUpDate: FieldValue.delete() } : {}),
  });
  const stageLabel = await stageLabelFor(type, stage);
  queueNote(db, batch, id, { text: `Moved to ${stageLabel}`, author: admin.email, kind: "stage" });
  queueAudit(db, batch, {
    actor: admin.email,
    action: "lead.stage_changed",
    entity: { type: "lead", id },
    summary: `Moved ${data.parentName ?? data.name ?? "lead"} to ${stageLabel}`,
    meta: { from: normalizeStage(data.stage ?? "new"), to: stage },
  });
  await batch.commit();
  revalidatePath(`/admin/leads/${id}`);
  });
}

export async function setFollowUp(formData: FormData): Promise<ActionResult> {
  return attempt("setFollowUp", async () => {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("followUpDate") ?? "").trim();
  if (!id) return fail("Missing lead id");

  let followUpDate: Date | FieldValue = FieldValue.delete();
  if (raw) {
    const d = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(d.getTime())) return fail("Invalid follow-up date");
    followUpDate = d;
  }

  const db = getDb();
  const batch = db.batch();
  batch.update(db.collection("leads").doc(id), {
    followUpDate,
    updatedAt: FieldValue.serverTimestamp(),
  });
  queueAudit(db, batch, {
    actor: admin.email,
    action: raw ? "lead.followup_set" : "lead.followup_cleared",
    entity: { type: "lead", id },
    summary: raw ? `Set follow-up for ${raw}` : "Cleared the follow-up date",
  });
  await batch.commit();
  revalidatePath(`/admin/leads/${id}`);
  });
}

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

  const db = getDb();
  const batch = db.batch();
  batch.update(db.collection("leads").doc(id), {
    followUpDate: target,
    updatedAt: FieldValue.serverTimestamp(),
  });
  queueAudit(db, batch, {
    actor: admin.email,
    action: "lead.followup_snoozed",
    entity: { type: "lead", id },
    summary: `Snoozed the follow-up by ${days} day${days === 1 ? "" : "s"}`,
    meta: { days },
  });
  await batch.commit();
  revalidatePath(`/admin/leads/${id}`);
  });
}

export async function logContact(formData: FormData): Promise<ActionResult> {
  return attempt("logContact", async () => {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const text = String(formData.get("text") ?? "").trim().slice(0, 2000);
  if (!id) return fail("Missing lead id");

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  const nextFollowUp = resolveFollowUp(
    String(formData.get("followUpDate") ?? ""),
    formData.get("followUpDays"),
  );
  if (nextFollowUp !== undefined) update.followUpDate = nextFollowUp ?? FieldValue.delete();

  if (!text && !("followUpDate" in update)) return;

  const db = getDb();
  const batch = db.batch();
  batch.update(db.collection("leads").doc(id), update);
  if (text) queueNote(db, batch, id, { text, author: admin.email, kind: "note" });
  queueAudit(db, batch, {
    actor: admin.email,
    action: "lead.contact_logged",
    entity: { type: "lead", id },
    summary: text ? "Logged a contact note" : "Updated the follow-up",
    meta: { hasNote: !!text },
  });
  await batch.commit();
  revalidatePath(`/admin/leads/${id}`);
  });
}

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
  const programInterest = pickFrom(await getPrograms(), String(formData.get("programInterest") ?? "").trim());

  const db2 = getDb();
  const batch2 = db2.batch();
  batch2.update(db2.collection("leads").doc(id), {
    parentName,
    childName: childName || null,
    phone,
    email: email || null,
    whatsapp: formData.get("whatsapp") === "on",
    programInterest,
    updatedAt: FieldValue.serverTimestamp(),
  });
  queueAudit(db2, batch2, {
    actor: admin.email,
    action: "lead.contact_edited",
    entity: { type: "lead", id },
    summary: `Edited contact details for ${parentName}`,
    meta: { phone },
  });
  await batch2.commit();
  revalidatePath(`/admin/leads/${id}`);
  });
}

export async function assignLead(formData: FormData): Promise<ActionResult> {
  return attempt("assignLead", async () => {
    const admin = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return fail("Missing lead id");

    const raw = String(formData.get("assignedTo") ?? "").trim().toLowerCase();
    const assignedTo = raw || null;
    if (assignedTo && !(await listAdminEmails()).includes(assignedTo)) {
      return fail("That address cannot sign in, so it cannot own a lead.");
    }

    const db = getDb();
    const ref = db.collection("leads").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return fail("That lead no longer exists.");
    const data = doc.data()!;
    if ((data.assignedTo ?? null) === assignedTo) return { ok: true as const };

    const name = data.parentName ?? data.name ?? "this lead";
    const batch = db.batch();
    batch.update(ref, { assignedTo, updatedAt: FieldValue.serverTimestamp() });
    queueNote(db, batch, id, {
      text: assignedTo ? `Assigned to ${assignedTo}` : "Assignment cleared",
      author: admin.email,
      kind: "stage",
    });
    queueAudit(db, batch, {
      actor: admin.email,
      action: "lead.assigned",
      entity: { type: "lead", id },
      summary: assignedTo ? `Assigned ${name} to ${assignedTo}` : `Cleared the assignment on ${name}`,
      meta: { from: data.assignedTo ?? null, to: assignedTo },
    });
    await batch.commit();

    if (assignedTo) {
      await notify("lead.assigned", {
        parentName: name,
        assignee: assignedTo,
        assignedBy: admin.email,
        entityType: "lead",
        entityId: id,
        link: `${SITE_URL}/admin/leads/${id}`,
      });
    }

    revalidatePath(`/admin/leads/${id}`);
  });
}

export async function setTags(formData: FormData): Promise<ActionResult> {
  return attempt("setTags", async () => {
    const admin = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return fail("Missing lead id");

    const vocabulary = await getLeadTags();
    const chosen = vocabulary.filter((t) => formData.get(`tag-${t}`) === "on");

    const db = getDb();
    const ref = db.collection("leads").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return fail("That lead no longer exists.");
    const before: string[] = Array.isArray(doc.data()!.tags) ? doc.data()!.tags : [];
    if (before.length === chosen.length && before.every((t) => chosen.includes(t))) return { ok: true as const };

    const batch = db.batch();
    batch.update(ref, { tags: chosen, updatedAt: FieldValue.serverTimestamp() });
    queueAudit(db, batch, {
      actor: admin.email,
      action: "lead.tags_changed",
      entity: { type: "lead", id },
      summary: chosen.length ? `Tagged: ${chosen.join(", ")}` : "Removed all tags",
      meta: { before: before.join(" "), after: chosen.join(" ") },
    });
    await batch.commit();
    revalidatePath(`/admin/leads/${id}`);
  });
}

export async function scheduleInterview(formData: FormData): Promise<ActionResult> {
  return attempt("scheduleInterview", async () => {
    const admin = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return fail("Missing lead id");

    const raw = String(formData.get("interviewAt") ?? "").trim();
    let interviewAt: Date | FieldValue = FieldValue.delete();
    if (raw) {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return fail("That interview time isn't valid.");
      interviewAt = d;
    }

    const location = String(formData.get("interviewLocation") ?? "").trim().slice(0, 120);
    const ratingRaw = Number(formData.get("rating"));
    const rating = Number.isInteger(ratingRaw) && ratingRaw >= 0 && ratingRaw <= 5 ? ratingRaw : null;
    if (rating === null) return fail("Rating must be between 1 and 5.");

    const db = getDb();
    const ref = db.collection("leads").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return fail("That candidate no longer exists.");

    const batch = db.batch();
    batch.update(ref, {
      interviewAt,
      interviewLocation: location || null,
      rating: rating === 0 ? null : rating,
      ...(raw ? { followUpDate: new Date(raw) } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    queueNote(db, batch, id, {
      text: raw
        ? `Interview scheduled for ${new Date(raw).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}${location ? ` at ${location}` : ""}`
        : "Interview cleared",
      author: admin.email,
      kind: "stage",
    });
    queueAudit(db, batch, {
      actor: admin.email,
      action: "application.interview_scheduled",
      entity: { type: "lead", id },
      summary: raw ? `Scheduled an interview for ${doc.data()!.name ?? "candidate"}` : "Cleared the interview",
      meta: { interviewAt: raw || null, rating },
    });
    await batch.commit();
    revalidatePath(`/admin/leads/${id}`);
  });
}
