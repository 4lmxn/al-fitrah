"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin, requireOwner } from "@/lib/adminAuth";
import { EMPLOYMENT_TYPES } from "@/lib/jobOpenings";

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
function parse(formData: FormData): ParsedOpening {
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (!title) throw new Error("Title is required");

  const employmentTypeRaw = String(formData.get("employmentType") ?? "Full-time");
  const employmentType = (EMPLOYMENT_TYPES as readonly string[]).includes(employmentTypeRaw)
    ? employmentTypeRaw
    : "Full-time";

  const requirements = String(formData.get("requirements") ?? "")
    .split("\n")
    .map((line) => line.trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 30);

  const orderRaw = Number(formData.get("order"));

  return {
    title,
    employmentType,
    summary: String(formData.get("summary") ?? "").trim().slice(0, 2000),
    requirements,
    active: formData.get("active") === "on",
    order: Number.isFinite(orderRaw) ? orderRaw : 0,
  };
}

// Revalidate both the admin list and the public careers page.
function revalidateAll(id?: string) {
  revalidatePath("/admin/openings");
  if (id) revalidatePath(`/admin/openings/${id}`);
  revalidatePath("/careers");
}

export async function createOpening(formData: FormData) {
  const admin = await requireAdmin();
  const data = parse(formData);
  const ref = await getDb().collection(COLLECTION).add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`opening created id=${ref.id} by=${admin.email}`);
  revalidateAll();
  redirect("/admin/openings");
}

export async function updateOpening(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing opening id");
  const data = parse(formData);
  await getDb().collection(COLLECTION).doc(id).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`opening updated id=${id} by=${admin.email}`);
  revalidateAll(id);
  redirect("/admin/openings");
}

// Toggle active straight from the list — formData carries id + next state.
export async function toggleOpening(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) throw new Error("Missing opening id");
  await getDb().collection(COLLECTION).doc(id).update({
    active,
    updatedAt: FieldValue.serverTimestamp(),
  });
  revalidateAll(id);
}

export async function deleteOpening(formData: FormData) {
  // Deletion is irreversible and leaves no record — owners only.
  const admin = await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing opening id");
  await getDb().collection(COLLECTION).doc(id).delete();
  console.log(`opening deleted id=${id} by=${admin.email}`);
  revalidateAll();
  redirect("/admin/openings");
}
