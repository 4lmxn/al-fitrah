"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { getEmploymentTypes, pickFrom } from "@/lib/taxonomy";
import { recordAudit } from "@/lib/audit";
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

type Parsed = { ok: true; data: ParsedOpening } | { ok: false; error: string };

async function parse(formData: FormData): Promise<Parsed> {
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (!title) return { ok: false, error: "Title is required" };

  const types = await getEmploymentTypes();
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
  await recordAudit({
    actor: admin.email,
    action: "opening.created",
    entity: { type: "opening", id: ref.id },
    summary: `Created opening "${data.title}"`,
  });
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
  await recordAudit({
    actor: admin.email,
    action: "opening.updated",
    entity: { type: "opening", id },
    summary: `Updated opening "${data.title}"`,
  });
  revalidateAll(id);
  redirect("/admin/openings");
  });
}

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
  const admin = await requireAdmin();
  if (admin.role !== "owner") return fail("Deleting an opening needs an owner account.");
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Missing opening id");
  await getDb().collection(COLLECTION).doc(id).delete();
  await recordAudit({
    actor: admin.email,
    action: "opening.deleted",
    entity: { type: "opening", id },
    summary: "Deleted a job opening",
  });
  revalidateAll();
  redirect("/admin/openings");
  });
}
