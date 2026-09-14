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
  eventDateMs: number | null;
  location: string | null;
  published: boolean;
  publishedAtMs: number | null;
  updatedAtMs: number | null;
  authorEmail: string | null;
};

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
