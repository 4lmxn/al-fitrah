import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { COMING_SOON } from "@/lib/flags";

const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" },
  { path: "/programs", priority: 0.9, changeFrequency: "monthly" },
  { path: "/syllabus", priority: 0.7, changeFrequency: "monthly" },
  { path: "/admissions", priority: 0.9, changeFrequency: "weekly" },
  { path: "/campus-life", priority: 0.7, changeFrequency: "monthly" },
  { path: "/news", priority: 0.7, changeFrequency: "weekly" },
  { path: "/parent-resources", priority: 0.6, changeFrequency: "monthly" },
  { path: "/resources", priority: 0.5, changeFrequency: "weekly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/careers", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.8, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const live = COMING_SOON ? routes.filter((r) => r.path === "/") : routes;

  return live.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  }));
}
