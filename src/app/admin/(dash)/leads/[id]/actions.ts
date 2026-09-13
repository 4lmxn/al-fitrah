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
import { getAllowlist } from "@/lib/roles";
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
  // Only the detail page is revalidated. The inbox list updates itself
  // optimistically (InboxBoard), so we deliberately DON'T revalidate "/admin" —
  // that would force a full getInbox() re-read (a page of docs plus its counts)
  // on every stage click.
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
  const programInterest = pickFrom(await getPrograms(), String(formData.get("programInterest") ?? "").trim());

  // Batched, not a bare update: an edit that is not recorded is worse than one
  // that fails, because nobody knows the record changed.
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

/**
 * Assign a lead to a member of staff, or clear the assignment.
 *
 * Restricted to the admin allowlist: assigning work to an address that cannot
 * sign in produces a lead nobody owns while looking like one somebody does.
 */
export async function assignLead(formData: FormData): Promise<ActionResult> {
  return attempt("assignLead", async () => {
    const admin = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return fail("Missing lead id");

    const raw = String(formData.get("assignedTo") ?? "").trim().toLowerCase();
    const assignedTo = raw || null;
    if (assignedTo && !getAllowlist().includes(assignedTo)) {
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

/**
 * Replace a lead's tags.
 *
 * Values are checked against the configured vocabulary. Free-text tags were the
 * alternative, and they rot the same way free-text class sections did:
 * "Sibling", "sibling" and "Sibling " become three tags, and a filter on any
 * one of them quietly misses most of the leads it should match.
 */
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

/**
 * Schedule an interview and record a rating.
 *
 * Both live on the lead rather than in a separate collection: a candidate has
 * one interview at a time and one current rating, and a subcollection would buy
 * history nobody has asked for at the cost of a second read on every open.
 *
 * The interview date deliberately reuses followUpDate. The digest, the overdue
 * query and the attention badge already work off that field — a parallel
 * "interviewDate" would need all three taught about it, and would compete with
 * follow-ups for the same attention.
 */
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
    // 0 clears the rating; anything outside 1-5 is a malformed submission.
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
      // Scheduling an interview is a follow-up: it puts the candidate back in
      // the digest on the right day instead of relying on someone remembering.
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
