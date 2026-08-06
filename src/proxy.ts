import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Holding-page gate (Next 16 renamed the `middleware` convention to `proxy`).
// When NEXT_PUBLIC_COMING_SOON === "1", every public route is rewritten to
// /coming-soon. Admin and API stay reachable so the team can still sign in and
// test the leads pipeline before the public launch. Flip the env to "0" (or
// remove it) and redeploy to reveal the finished site.
// Shared with robots.ts and sitemap.ts so the gate, the crawl rules, and the
// submitted URLs can never disagree about whether the site is live.
import { COMING_SOON } from "@/lib/flags";

export function proxy(request: NextRequest) {
  if (!COMING_SOON) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (
    pathname === "/coming-soon" ||
    pathname.startsWith("/admin") ||
    // Parents of enrolled children need the portal even while the public site
    // is still behind the holding page.
    pathname.startsWith("/portal") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Rewrite (200), not redirect: the visited URL stays intact, so shared deep
  // links keep working and resolve to the real page once the flag is off.
  const url = request.nextUrl.clone();
  url.pathname = "/coming-soon";
  return NextResponse.rewrite(url);
}

export const config = {
  // Run on everything except Next internals and the metadata/icon routes, so
  // the holding page never blocks its own CSS, fonts, or share image.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon|opengraph-image|robots.txt|sitemap.xml).*)",
  ],
};
