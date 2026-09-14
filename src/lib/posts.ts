import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { POST_TYPES, type Post, type PostType } from "@/lib/postMeta";

export { POST_TYPES, POST_TYPE_LABEL, slugify } from "@/lib/postMeta";
export type { Post, PostType } from "@/lib/postMeta";

export const COLLECTION = "posts";

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

export async function publishedSlugs(limit = 50): Promise<string[]> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("published", "==", true)
    .orderBy("publishedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data().slug).filter(Boolean);
}

export async function listAllPosts(): Promise<Post[]> {
  await requireAdmin();
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

export async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const snap = await getDb().collection(COLLECTION).where("slug", "==", slug).limit(2).get();
  return snap.docs.some((d) => d.id !== exceptId);
}
