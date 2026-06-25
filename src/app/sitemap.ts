import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Public, indexable routes. Admin (/admin) and API (/api) are intentionally
// excluded — they are blocked in robots.ts too.
const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" },
  { path: "/programs", priority: 0.9, changeFrequency: "monthly" },
  { path: "/syllabus", priority: 0.7, changeFrequency: "monthly" },
  { path: "/admissions", priority: 0.9, changeFrequency: "weekly" },
  { path: "/campus-life", priority: 0.7, changeFrequency: "monthly" },
  { path: "/parent-resources", priority: 0.6, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/careers", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.8, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
