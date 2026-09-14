import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { COMING_SOON } from "@/lib/flags";

export function proxy(request: NextRequest) {
  if (!COMING_SOON) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (
    pathname === "/coming-soon" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/coming-soon";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon|opengraph-image|robots.txt|sitemap.xml|google[0-9a-f]+.html).*)",
  ],
};
