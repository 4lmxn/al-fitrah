"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";
import { queueAudit } from "@/lib/audit";
import { queueNote } from "@/lib/notes";
import { listAdminEmails } from "@/lib/roles";
import { isValidStage, stageLabelFor, terminalStages } from "@/lib/pipelines";
import type { LeadType } from "@/lib/leads";

const MAX_SELECTION = 100;

function ids(formData: FormData): string[] {
  return [...new Set(formData.getAll("id").map((v) => String(v).trim()).filter(Boolean))];
}

export async function bulkUpdateStage(formData: FormData): Promise<ActionResult> {
  return attempt("bulkUpdateStage", async () => {
    const admin = await requireAdmin();
    const selected = ids(formData);
    const stage = String(formData.get("stage") ?? "");
    const type = String(formData.get("type") ?? "") as LeadType;

    if (selected.length === 0) return fail("Select some leads first.");
    if (selected.length > MAX_SELECTION) return fail(`Select at most ${MAX_SELECTION} leads at a time.`);
    if (!(await isValidStage(type, stage))) return fail("That stage is not in this pipeline.");

    const db = getDb();
    const label = await stageLabelFor(type, stage);
    const terminal = await terminalStages(type);
    const batch = db.batch();

    for (const id of selected) {
      const ref = db.collection("leads").doc(id);
      batch.update(ref, {
        stage,
        ...(terminal.has(stage) ? { followUpDate: FieldValue.delete() } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      queueNote(db, batch, id, { text: `Moved to ${label}`, author: admin.email, kind: "stage" });
    }

    queueAudit(db, batch, {
      actor: admin.email,
      action: "lead.bulk_stage_changed",
      entity: { type: "lead", id: "bulk" },
      summary: `Moved ${selected.length} lead${selected.length === 1 ? "" : "s"} to ${label}`,
      meta: { count: selected.length, stage, ids: selected.slice(0, 20).join(" ") },
    });

    await batch.commit();
    revalidatePath("/admin");
  });
}

export async function bulkAssign(formData: FormData): Promise<ActionResult> {
  return attempt("bulkAssign", async () => {
    const admin = await requireAdmin();
    const selected = ids(formData);
    if (selected.length === 0) return fail("Select some leads first.");
    if (selected.length > MAX_SELECTION) return fail(`Select at most ${MAX_SELECTION} leads at a time.`);

    const raw = String(formData.get("assignedTo") ?? "").trim().toLowerCase();
    const assignedTo = raw || null;
    if (assignedTo && !(await listAdminEmails()).includes(assignedTo)) {
      return fail("That address cannot sign in, so it cannot own a lead.");
    }

    const db = getDb();
    const batch = db.batch();
    for (const id of selected) {
      batch.update(db.collection("leads").doc(id), { assignedTo, updatedAt: FieldValue.serverTimestamp() });
      queueNote(db, batch, id, {
        text: assignedTo ? `Assigned to ${assignedTo}` : "Assignment cleared",
        author: admin.email,
        kind: "stage",
      });
    }
    queueAudit(db, batch, {
      actor: admin.email,
      action: "lead.bulk_assigned",
      entity: { type: "lead", id: "bulk" },
      summary: assignedTo
        ? `Assigned ${selected.length} lead${selected.length === 1 ? "" : "s"} to ${assignedTo}`
        : `Cleared the owner on ${selected.length} lead${selected.length === 1 ? "" : "s"}`,
      meta: { count: selected.length, assignedTo, ids: selected.slice(0, 20).join(" ") },
    });

    await batch.commit();
    revalidatePath("/admin");
  });
}
