import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { COMING_SOON } from "@/lib/flags";

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

// No `lastModified`: a build-time `new Date()` stamps every URL on every deploy,
// which Google learns to distrust. Omit it until we track real per-page dates.
export default function sitemap(): MetadataRoute.Sitemap {
  // While gated, every path below returns the holding page. Submitting them
  // would hand Google 11 URLs of identical content to crawl and distrust, so
  // the sitemap narrows to the one page that is genuinely live.
  const live = COMING_SOON ? routes.filter((r) => r.path === "/") : routes;

  return live.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  }));
}
