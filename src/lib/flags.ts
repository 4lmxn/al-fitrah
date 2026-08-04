// Deployment flags. Deliberately dependency-free: `proxy.ts` runs on every
// request, so anything it imports must not pull in content or SEO modules.

// Holding-page gate. When "1", proxy.ts rewrites every public route to
// /coming-soon, and robots/sitemap narrow to just "/" so Google is never
// pointed at URLs that currently serve the holding page.
export const COMING_SOON = process.env.NEXT_PUBLIC_COMING_SOON === "1";
