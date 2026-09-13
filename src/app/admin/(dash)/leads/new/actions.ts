"use server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { getManualLeadSources, getPrograms, pickFrom } from "@/lib/taxonomy";
import { AGE_BANDS } from "@/lib/leadSchema";
import { queueNote } from "@/lib/notes";
import { queueAudit } from "@/lib/audit";
import { findDuplicate, leadDefaults } from "@/lib/leadOps";

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

// Staff-entered lead (walk-in, phone, WhatsApp, referral). Lands the same
// `leads` collection so a manually-logged enquiry flows through the identical
// pipeline as a website submission. Redirects to the new lead on success.
export async function createLead(formData: FormData) {
  const admin = await requireAdmin();

  const parentName = clean(formData.get("parentName"), 80);
  const phone = clean(formData.get("phone"), 20);
  if (parentName.length < 2) throw new Error("Parent name is required");
  if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) throw new Error("A valid phone number is required");

  const manualSources = await getManualLeadSources();
  // Fall back to the first configured source rather than a hardcoded "walk-in",
  // which a school may well have renamed or removed.
  const source = pickFrom(manualSources, clean(formData.get("source"), 40)) ?? manualSources[0] ?? "walk-in";

  const childAgeRaw = clean(formData.get("childAge"), 20);
  const childAge = (AGE_BANDS as readonly string[]).includes(childAgeRaw) ? childAgeRaw : null;

  const programInterest = pickFrom(await getPrograms(), clean(formData.get("programInterest"), 60));

  const email = clean(formData.get("email"), 120);
  const childName = clean(formData.get("childName"), 80);
  const referredBy = clean(formData.get("referredBy"), 60);
  const firstNote = clean(formData.get("note"), 2000);
  const whatsapp = formData.get("whatsapp") === "on";

  const db = getDb();
  const ref = db.collection("leads").doc();
  const batch = db.batch();

  batch.set(ref, {
    type: "admission_inquiry",
    parentName,
    childName: childName || null,
    phone,
    whatsapp,
    email: email || null,
    childAge,
    programInterest,
    message: null,
    stage: "new",
    source,
    ...(referredBy ? { referredBy } : {}),
    ...leadDefaults(phone, await findDuplicate(phone)),
  });

  // The note staff typed while logging the walk-in becomes the first timeline
  // entry, and bumps noteCount off zero — so the lead doesn't immediately show
  // up as an "untouched new enquiry" needing attention.
  if (firstNote) queueNote(db, batch, ref.id, { text: firstNote, author: admin.email, kind: "note" });

  queueAudit(db, batch, {
    actor: admin.email,
    action: "lead.created",
    entity: { type: "lead", id: ref.id },
    summary: `Logged ${parentName} as a lead`,
    meta: { source },
  });

  await batch.commit();

  redirect(`/admin/leads/${ref.id}`);
}
