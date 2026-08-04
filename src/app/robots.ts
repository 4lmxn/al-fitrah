import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { COMING_SOON } from "@/lib/flags";

export default function robots(): MetadataRoute.Robots {
  // While the holding page is up, proxy.ts serves it (HTTP 200) at every public
  // path. Those paths must not be crawled: each would return the holding page,
  // teaching Google that /about, /programs etc. are duplicate junk before they
  // ever hold real content. "Allow: /$" anchors to the root only, so the one
  // page we do want indexed while gated stays crawlable.
  const rules = COMING_SOON
    ? { userAgent: "*", allow: "/$", disallow: "/" }
    : { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] };

  return {
    rules,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
