import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { COMING_SOON } from "@/lib/flags";

export default function robots(): MetadataRoute.Robots {
  const rules = COMING_SOON
    ? { userAgent: "*", allow: "/$", disallow: "/" }
    : { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/portal"] };

  return {
    rules,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
