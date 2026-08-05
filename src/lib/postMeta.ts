// Post shape and constants, kept free of server-only imports so the admin form
// (a client component) can share one definition with the server queries. Same
// split as lib/attention.ts — a "use client" module importing a `server-only`
// one drags Firestore into the browser bundle and fails the build.

export const POST_TYPES = ["news", "event"] as const;
export type PostType = (typeof POST_TYPES)[number];

export const POST_TYPE_LABEL: Record<PostType, string> = {
  news: "News",
  event: "Event",
};

export type Post = {
  id: string;
  type: PostType;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  imageUrl: string | null;
  imagePath: string | null;
  /** Events only: when it happens. News posts leave this null. */
  eventDateMs: number | null;
  location: string | null;
  published: boolean;
  publishedAtMs: number | null;
  updatedAtMs: number | null;
  authorEmail: string | null;
};

/**
 * URL-safe slug from a title.
 *
 * Slugs are the public address of a post, so they are generated once at
 * creation and never re-derived on edit — a title typo fixed a week later must
 * not silently 404 every link already shared with parents.
 */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "post";
}
