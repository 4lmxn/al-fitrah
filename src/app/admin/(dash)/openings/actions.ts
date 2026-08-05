"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { getEmploymentTypes, pickFrom } from "@/lib/taxonomy";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";

const COLLECTION = "jobOpenings";

type ParsedOpening = {
  title: string;
  employmentType: string;
  summary: string;
  requirements: string[];
  active: boolean;
  order: number;
};

// Length caps mirror the public zod schemas: openings render on the public
// careers page, so even admin input gets bounded.
// Returns a result rather than throwing so a validation message survives to the
// UI intact — routed through attempt() it would collapse to "something went
// wrong", which tells an admin nothing about the empty title field.
type Parsed = { ok: true; data: ParsedOpening } | { ok: false; error: string };

async function parse(formData: FormData): Promise<Parsed> {
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (!title) return { ok: false, error: "Title is required" };

  const types = await getEmploymentTypes();
  // Fall back to the first configured type rather than a hardcoded "Full-time",
  // which a school may have renamed or removed.
  const employmentType = pickFrom(types, String(formData.get("employmentType") ?? "")) ?? types[0] ?? "Full-time";

  const requirements = String(formData.get("requirements") ?? "")
    .split("\n")
    .map((line) => line.trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 30);

  const orderRaw = Number(formData.get("order"));

  return {
    ok: true,
    data: {
      title,
      employmentType,
      summary: String(formData.get("summary") ?? "").trim().slice(0, 2000),
      requirements,
      active: formData.get("active") === "on",
      order: Number.isFinite(orderRaw) ? orderRaw : 0,
    },
  };
}

// Revalidate both the admin list and the public careers page.
function revalidateAll(id?: string) {
  revalidatePath("/admin/openings");
  if (id) revalidatePath(`/admin/openings/${id}`);
  revalidatePath("/careers");
}

export async function createOpening(formData: FormData): Promise<ActionResult> {
  return attempt("createOpening", async () => {
  const admin = await requireAdmin();
  const parsed = await parse(formData);
  if (!parsed.ok) return fail(parsed.error);
  const data = parsed.data;
  const ref = await getDb().collection(COLLECTION).add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`opening created id=${ref.id} by=${admin.email}`);
  revalidateAll();
  redirect("/admin/openings");
  });
}

export async function updateOpening(formData: FormData): Promise<ActionResult> {
  return attempt("updateOpening", async () => {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Missing opening id");
  const parsed = await parse(formData);
  if (!parsed.ok) return fail(parsed.error);
  const data = parsed.data;
  await getDb().collection(COLLECTION).doc(id).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`opening updated id=${id} by=${admin.email}`);
  revalidateAll(id);
  redirect("/admin/openings");
  });
}

// Toggle active straight from the list — formData carries id + next state.
export async function toggleOpening(formData: FormData): Promise<ActionResult> {
  return attempt("toggleOpening", async () => {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return fail("Missing opening id");
  await getDb().collection(COLLECTION).doc(id).update({
    active,
    updatedAt: FieldValue.serverTimestamp(),
  });
  revalidateAll(id);
  });
}

export async function deleteOpening(formData: FormData): Promise<ActionResult> {
  return attempt("deleteOpening", async () => {
  // Deletion is irreversible and leaves no record — owners only. Checked here
  // rather than via requireOwner() so the refusal reaches the admin as a
  // message; a throw would be flattened to "something went wrong" by attempt().
  const admin = await requireAdmin();
  if (admin.role !== "owner") return fail("Deleting an opening needs an owner account.");
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Missing opening id");
  await getDb().collection(COLLECTION).doc(id).delete();
  console.log(`opening deleted id=${id} by=${admin.email}`);
  revalidateAll();
  redirect("/admin/openings");
  });
}
