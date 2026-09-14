"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";
import { COLLECTION, POST_TYPES, slugTaken, slugify, type PostType } from "@/lib/posts";
import { detectImageType, deleteObject, publicImagesSupported, uploadPostImage, validateImage } from "@/lib/storage";
import { recordAudit } from "@/lib/audit";

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

function revalidatePublic(slug?: string) {
  revalidatePath("/");
  revalidatePath("/news");
  if (slug) revalidatePath(`/news/${slug}`);
  revalidatePath("/admin/content");
}

type Parsed =
  | { ok: true; data: { type: PostType; title: string; excerpt: string; body: string; eventDate: Date | null; location: string | null; published: boolean } }
  | { ok: false; error: string };

function parse(formData: FormData): Parsed {
  const title = clean(formData.get("title"), 140);
  if (title.length < 3) return { ok: false, error: "Give the post a title." };

  const typeRaw = clean(formData.get("type"), 20);
  const type: PostType = (POST_TYPES as readonly string[]).includes(typeRaw) ? (typeRaw as PostType) : "news";

  const body = clean(formData.get("body"), 20000);
  if (!body) return { ok: false, error: "The post needs some content." };

  let eventDate: Date | null = null;
  const dateRaw = clean(formData.get("eventDate"), 20);
  if (type === "event") {
    if (!dateRaw) return { ok: false, error: "An event needs a date." };
    const d = new Date(`${dateRaw}T00:00:00`);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "That event date isn't valid." };
    eventDate = d;
  }

  return {
    ok: true,
    data: {
      type,
      title,
      excerpt: clean(formData.get("excerpt"), 300) || body.replace(/\s+/g, " ").slice(0, 200),
      body,
      eventDate,
      location: type === "event" ? clean(formData.get("location"), 120) || null : null,
      published: formData.get("published") === "on",
    },
  };
}

async function handleImage(
  formData: FormData,
  postId: string,
): Promise<{ ok: true; image: { path: string; url: string } | null } | { ok: false; error: string }> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: true, image: null };

  if (!publicImagesSupported()) {
    return {
      ok: false,
      error:
        "Images can't be published yet — the file store is private and has no public address. " +
        "Save the post without an image, or ask the developer to set up image hosting.",
    };
  }

  const check = validateImage({ type: file.type, size: file.size });
  if (!check.ok) return check;

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = detectImageType(buffer);
  if (!sniffed) return { ok: false, error: "That file isn't a JPG, PNG or WebP image." };

  return { ok: true, image: await uploadPostImage(postId, { buffer, contentType: sniffed }) };
}

export async function createPost(formData: FormData): Promise<ActionResult> {
  return attempt("createPost", async () => {
    const admin = await requireAdmin();
    const parsed = parse(formData);
    if (!parsed.ok) return fail(parsed.error);
    const data = parsed.data;

    let slug = slugify(data.title);
    if (await slugTaken(slug)) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const db = getDb();
    const ref = db.collection(COLLECTION).doc();

    const img = await handleImage(formData, ref.id);
    if (!img.ok) return fail(img.error);

    await ref.set({
      ...data,
      slug,
      imageUrl: img.image?.url ?? null,
      imagePath: img.image?.path ?? null,
      publishedAt: data.published ? FieldValue.serverTimestamp() : null,
      authorEmail: admin.email,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await recordAudit({
      actor: admin.email,
      action: "post.created",
      entity: { type: "post", id: ref.id },
      summary: `Created ${data.published ? "and published " : ""}"${data.title}"`,
      meta: { type: data.type, published: data.published },
    });
    revalidatePublic(slug);
    redirect("/admin/content");
  });
}

export async function updatePost(formData: FormData): Promise<ActionResult> {
  return attempt("updatePost", async () => {
    const admin = await requireAdmin();
    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing post id");

    const parsed = parse(formData);
    if (!parsed.ok) return fail(parsed.error);
    const data = parsed.data;

    const db = getDb();
    const ref = db.collection(COLLECTION).doc(id);
    const existing = await ref.get();
    if (!existing.exists) return fail("That post no longer exists.");
    const prev = existing.data()!;

    const img = await handleImage(formData, id);
    if (!img.ok) return fail(img.error);

    const update: Record<string, unknown> = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (data.published && !prev.published) update.publishedAt = FieldValue.serverTimestamp();
    if (!data.published) update.publishedAt = null;

    if (img.image) {
      update.imageUrl = img.image.url;
      update.imagePath = img.image.path;
    }

    await ref.update(update);

    if (img.image && prev.imagePath) {
      await deleteObject(prev.imagePath).catch((err) => console.error("old post image cleanup failed", err));
    }

    await recordAudit({
      actor: admin.email,
      action: "post.updated",
      entity: { type: "post", id },
      summary: `Updated "${data.title}"`,
      meta: { published: data.published },
    });
    revalidatePublic(prev.slug);
    redirect("/admin/content");
  });
}

export async function togglePublished(formData: FormData): Promise<ActionResult> {
  return attempt("togglePublished", async () => {
    const admin = await requireAdmin();
    const id = clean(formData.get("id"), 60);
    const next = formData.get("published") === "true";
    if (!id) return fail("Missing post id");

    const ref = getDb().collection(COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return fail("That post no longer exists.");

    await ref.update({
      published: next,
      publishedAt: next ? (doc.data()!.publishedAt ?? FieldValue.serverTimestamp()) : null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await recordAudit({
      actor: admin.email,
      action: next ? "post.published" : "post.unpublished",
      entity: { type: "post", id },
      summary: `${next ? "Published" : "Unpublished"} "${doc.data()!.title}"`,
    });
    revalidatePublic(doc.data()!.slug);
  });
}

export async function deletePost(formData: FormData): Promise<ActionResult> {
  return attempt("deletePost", async () => {
    const admin = await requireAdmin();
    if (admin.role !== "owner") return fail("Deleting a post needs an owner account.");

    const id = clean(formData.get("id"), 60);
    if (!id) return fail("Missing post id");

    const ref = getDb().collection(COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return fail("That post no longer exists.");
    const { slug, imagePath } = doc.data()!;

    await ref.delete();
    if (imagePath) await deleteObject(imagePath).catch((err) => console.error("post image cleanup failed", err));

    await recordAudit({
      actor: admin.email,
      action: "post.deleted",
      entity: { type: "post", id },
      summary: `Deleted post "${doc.data()!.title}"`,
    });
    revalidatePublic(slug);
    redirect("/admin/content");
  });
}
