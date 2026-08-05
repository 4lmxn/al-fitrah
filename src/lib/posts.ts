import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { POST_TYPES, type Post, type PostType } from "@/lib/postMeta";

export { POST_TYPES, POST_TYPE_LABEL, slugify } from "@/lib/postMeta";
export type { Post, PostType } from "@/lib/postMeta";

/**
 * News and events — the parts of the site that change without a developer.
 *
 * One collection with a `type` discriminator, which is the opposite of the call
 * made for students. The difference is real: news and events share every field
 * and every query (published, newest first), differing only in whether an
 * `eventDate` is set. Leads and students shared a collection while sharing
 * almost nothing, so every read paid for fields it couldn't use. Here a split
 * would mean two identical collections, two identical indexes, and a merge in
 * memory to render a combined homepage feed.
 *
 * Public pages read this through ISR, never per request. A visitor costs zero
 * Firestore reads; a revalidation costs one page of documents. Admin edits call
 * revalidatePath, so a publish is live immediately and the timed window is only
 * a backstop.
 */

export const COLLECTION = "posts";

// Public listing size. Bounded for the same reason every other list here is:
// a page that grows with the archive eventually costs a page of reads to render.
export const PUBLIC_PAGE_SIZE = 12;
export const ADMIN_PAGE_SIZE = 25;

export function toPost(d: FirebaseFirestore.DocumentSnapshot): Post {
  const x = d.data() ?? {};
  return {
    id: d.id,
    type: (POST_TYPES as readonly string[]).includes(x.type) ? x.type : "news",
    title: x.title ?? "",
    slug: x.slug ?? d.id,
    excerpt: x.excerpt ?? "",
    body: x.body ?? "",
    imageUrl: x.imageUrl ?? null,
    imagePath: x.imagePath ?? null,
    eventDateMs: x.eventDate?.toMillis?.() ?? null,
    location: x.location ?? null,
    published: x.published === true,
    publishedAtMs: x.publishedAt?.toMillis?.() ?? null,
    updatedAtMs: x.updatedAt?.toMillis?.() ?? null,
    authorEmail: x.authorEmail ?? null,
  };
}

// ── Public reads (called from ISR pages, never per request) ─────────────────

export async function listPublished(type?: PostType, limit = PUBLIC_PAGE_SIZE): Promise<Post[]> {
  let q = getDb().collection(COLLECTION).where("published", "==", true);
  if (type) q = q.where("type", "==", type);
  const snap = await q.orderBy("publishedAt", "desc").limit(limit).get();
  return snap.docs.map(toPost);
}

export async function getPublishedBySlug(slug: string): Promise<Post | null> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("slug", "==", slug)
    .where("published", "==", true)
    .limit(1)
    .get();
  return snap.empty ? null : toPost(snap.docs[0]);
}

/** Slugs for generateStaticParams. Bounded — the archive is not prerendered whole. */
export async function publishedSlugs(limit = 50): Promise<string[]> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("published", "==", true)
    .orderBy("publishedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data().slug).filter(Boolean);
}

// ── Admin reads ─────────────────────────────────────────────────────────────

export async function listAllPosts(): Promise<Post[]> {
  await requireAdmin();
  // Drafts have no publishedAt, so ordering by it would drop them entirely.
  const snap = await getDb()
    .collection(COLLECTION)
    .orderBy("updatedAt", "desc")
    .limit(ADMIN_PAGE_SIZE)
    .get();
  return snap.docs.map(toPost);
}

export async function getPost(id: string): Promise<Post | null> {
  await requireAdmin();
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  return doc.exists ? toPost(doc) : null;
}

/** Is this slug already taken by a different post? */
export async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const snap = await getDb().collection(COLLECTION).where("slug", "==", slug).limit(2).get();
  return snap.docs.some((d) => d.id !== exceptId);
}
