"use server";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { MANUAL_SOURCES, PROGRAM_INTERESTS } from "@/lib/leads";
import { AGE_BANDS } from "@/lib/leadSchema";
import { queueNote } from "@/lib/notes";

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

  const sourceRaw = clean(formData.get("source"), 20);
  const source = (MANUAL_SOURCES as readonly string[]).includes(sourceRaw) ? sourceRaw : "walk-in";

  const childAgeRaw = clean(formData.get("childAge"), 20);
  const childAge = (AGE_BANDS as readonly string[]).includes(childAgeRaw) ? childAgeRaw : null;

  const programRaw = clean(formData.get("programInterest"), 20);
  const programInterest = (PROGRAM_INTERESTS as readonly string[]).includes(programRaw) ? programRaw : null;

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
    noteCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // The note staff typed while logging the walk-in becomes the first timeline
  // entry, and bumps noteCount off zero — so the lead doesn't immediately show
  // up as an "untouched new enquiry" needing attention.
  if (firstNote) queueNote(db, batch, ref.id, { text: firstNote, author: admin.email, kind: "note" });

  await batch.commit();

  console.log(`lead created id=${ref.id} source=${source} by=${admin.email}`);
  redirect(`/admin/leads/${ref.id}`);
}
