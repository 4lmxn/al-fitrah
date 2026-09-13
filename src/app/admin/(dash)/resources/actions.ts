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

/**
 * Does a file shared with anyone belong at a world-readable path?
 *
 * Who may see a file is the school's decision; whether the bucket can serve it
 * without this app is the bucket's. The Mumbai files bucket has no public read
 * endpoint (docs/deploy-cloudrun-cloudflare.md §9), so a `content/` object
 * there would be unreachable at the URL we stored — the same silent failure
 * publicImagesSupported() already stops for post images.
 *
 * When it cannot, the file stays at the closed prefix and gets no publicUrl,
 * and every surface falls back to the download route, which already serves a
 * public file to an anonymous viewer. The audience is unchanged either way.
 */
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
  // Checkbox group: getAll, filtered against the known set. An unknown value
  // here would be stored and then matched by nothing, which reads in the UI as
  // "shared" while being visible to no one.
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
  // The public list is cached; an edit that changes what is shared has to reach
  // it immediately, or a file "unshared" in the console stays on the site.
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

    // Bytes first. A document pointing at an object that failed to upload is a
    // broken row in every list; an orphaned object is invisible and cheap.
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
      // Written only for files the bucket itself can serve. A null here would
      // be a placeholder in an indexed field, which is the pattern this
      // codebase keeps removing.
      ...(atPublicPath ? { publicUrl: publicUrlFor(storagePath) } : {}),
      // Nothing scans uploads yet, so nothing can mark them clean; see
      // lib/resources for what wiring a scanner changes.
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

    console.log(`resource uploaded id=${ref.id} public=${isPublic} by=${admin.email}`);
    revalidateAll();
  });
}

/**
 * Edit a resource's details and who it is shared with.
 *
 * Crossing the public boundary moves the bytes, because the prefix is the
 * permission (see lib/resources). Un-sharing a file that stayed at a
 * world-readable path would be private in the console and public in reality.
 */
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
      // Before the document, so a failed move leaves the record honest about
      // where the bytes are rather than pointing at a path that does not exist.
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
    // Same rule as job openings and fee structures: deletion is irreversible,
    // so owners only, and checked here so the refusal reaches the admin as a
    // message rather than a blanked page.
    const admin = await requireAdmin();
    if (admin.role !== "owner") return fail("Deleting a file needs an owner account.");
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing file id");

    const db = getDb();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return fail("That file no longer exists.");
    const resource = toResource(doc);

    // Object first: a deleted document with the bytes still in the bucket is a
    // file nobody can find and everybody keeps paying to store — and, if it was
    // public, one still sitting at a live URL.
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
