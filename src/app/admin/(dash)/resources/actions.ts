"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";
import { COLLECTION, isAudience, toResource, type Audience } from "@/lib/resources";
import {
  deleteObject,
  moveObject,
  publicImagesSupported,
  publicUrlFor,
  resourceStoragePath,
  uploadResource,
  validateResourceFile,
} from "@/lib/storage";
import { academicYearFor } from "@/lib/students";
import { getClassSections, pickFrom } from "@/lib/taxonomy";
import { queueAudit, recordAudit } from "@/lib/audit";

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

const servedStraightFromStorage = (isPublic: boolean) => isPublic && publicImagesSupported();

type ParsedMeta = {
  title: string;
  description: string;
  category: string;
  classSection: string | null;
  academicYear: string;
  audience: Audience[];
};

type Parsed = { ok: true; data: ParsedMeta } | { ok: false; error: string };

async function parse(formData: FormData): Promise<Parsed> {
  const title = clean(formData.get("title"), 120);
  if (!title) return { ok: false, error: "Give the file a title." };

  const sections = await getClassSections();
  const audience = formData.getAll("audience").map(String).filter(isAudience);

  return {
    ok: true,
    data: {
      title,
      description: clean(formData.get("description"), 600),
      category: clean(formData.get("category"), 60),
      classSection: pickFrom(sections, clean(formData.get("classSection"), 60)),
      academicYear: clean(formData.get("academicYear"), 12) || academicYearFor(),
      audience,
    },
  };
}

function revalidateAll(id?: string) {
  revalidatePath("/admin/resources");
  if (id) revalidatePath(`/admin/resources/${id}`);
  revalidatePath("/resources");
  revalidatePath("/portal/resources");
}

export async function createResource(formData: FormData): Promise<ActionResult> {
  return attempt("createResource", async () => {
    const admin = await requireAdmin();
    const parsed = await parse(formData);
    if (!parsed.ok) return fail(parsed.error);

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return fail("Attach a file to share.");
    const check = validateResourceFile({ type: file.type, size: file.size });
    if (!check.ok) return fail(check.error);

    const db = getDb();
    const ref = db.collection(COLLECTION).doc();
    const isPublic = parsed.data.audience.includes("public");
    const atPublicPath = servedStraightFromStorage(isPublic);
    const storagePath = resourceStoragePath(ref.id, file.name, atPublicPath);

    await uploadResource(storagePath, {
      buffer: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      fileName: file.name,
    });

    const batch = db.batch();
    batch.set(ref, {
      ...parsed.data,
      fileName: file.name.slice(0, 200),
      contentType: file.type,
      sizeBytes: file.size,
      storagePath,
      ...(atPublicPath ? { publicUrl: publicUrlFor(storagePath) } : {}),
      scanStatus: "clean",
      downloadCount: 0,
      uploadedBy: admin.email,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    queueAudit(db, batch, {
      actor: admin.email,
      action: "resource.uploaded",
      entity: { type: "resource", id: ref.id },
      summary: `Uploaded “${parsed.data.title}” for ${parsed.data.audience.join(", ") || "nobody yet"}`,
      meta: { sizeBytes: file.size, public: isPublic },
    });
    await batch.commit();

    revalidateAll();
  });
}

export async function updateResource(formData: FormData): Promise<ActionResult> {
  return attempt("updateResource", async () => {
    const admin = await requireAdmin();
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing file id");
    const parsed = await parse(formData);
    if (!parsed.ok) return fail(parsed.error);

    const db = getDb();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return fail("That file no longer exists.");
    const current = toResource(doc);

    const isPublic = parsed.data.audience.includes("public");
    const atPublicPath = servedStraightFromStorage(isPublic);
    const wasPublic = current.storagePath.startsWith("content/");
    let storagePath = current.storagePath;

    if (atPublicPath !== wasPublic) {
      storagePath = resourceStoragePath(id, current.fileName, atPublicPath);
      await moveObject(current.storagePath, storagePath);
    }

    const batch = db.batch();
    batch.update(doc.ref, {
      ...parsed.data,
      storagePath,
      ...(atPublicPath
        ? { publicUrl: publicUrlFor(storagePath) }
        : { publicUrl: FieldValue.delete() }),
      updatedAt: FieldValue.serverTimestamp(),
    });
    queueAudit(db, batch, {
      actor: admin.email,
      action: "resource.updated",
      entity: { type: "resource", id },
      summary:
        isPublic === wasPublic
          ? `Updated “${parsed.data.title}”`
          : isPublic
            ? `Made “${parsed.data.title}” public`
            : `Made “${parsed.data.title}” private`,
      meta: { public: isPublic, audience: parsed.data.audience.join(",") },
    });
    await batch.commit();

    revalidateAll(id);
  });
}

export async function deleteResource(formData: FormData): Promise<ActionResult> {
  return attempt("deleteResource", async () => {
    const admin = await requireAdmin();
    if (admin.role !== "owner") return fail("Deleting a file needs an owner account.");
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing file id");

    const db = getDb();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return fail("That file no longer exists.");
    const resource = toResource(doc);

    await deleteObject(resource.storagePath);
    await doc.ref.delete();
    await recordAudit({
      actor: admin.email,
      action: "resource.deleted",
      entity: { type: "resource", id },
      summary: `Deleted “${resource.title}”`,
    });

    revalidateAll();
  });
}
