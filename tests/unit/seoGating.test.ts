import { describe, expect, it, vi, afterEach } from "vitest";

// robots.ts and sitemap.ts read the COMING_SOON flag at module load, so each
// case needs a fresh module graph with the env set before import.
async function loadWith(flag: string | undefined) {
  vi.resetModules();
  if (flag === undefined) delete process.env.NEXT_PUBLIC_COMING_SOON;
  else process.env.NEXT_PUBLIC_COMING_SOON = flag;

  const robots = (await import("@/app/robots")).default;
  const sitemap = (await import("@/app/sitemap")).default;
  return { robots: robots(), sitemap: sitemap() };
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_COMING_SOON;
  vi.resetModules();
});

describe("crawl gating while the holding page is up", () => {
  it("submits only the root, because every other path serves the holding page", async () => {
    const { sitemap } = await loadWith("1");
    expect(sitemap).toHaveLength(1);
    expect(sitemap[0].url).toMatch(/\/$/);
  });

  it("anchors robots to the root only", async () => {
    const { robots } = await loadWith("1");
    const rules = robots.rules as { allow: string; disallow: string };
    // "/$" is an exact-match anchor: the root stays crawlable (it is indexable
    // on purpose, canonical "/"), everything below it does not.
    expect(rules.allow).toBe("/$");
    expect(rules.disallow).toBe("/");
  });
});

describe("crawl rules once the site is live", () => {
  it("submits the full route list", async () => {
    const { sitemap } = await loadWith("0");
    expect(sitemap.length).toBeGreaterThan(1);
    const paths = sitemap.map((e) => new URL(e.url).pathname);
    expect(paths).toContain("/admissions");
    expect(paths).toContain("/programs");
  });

  it("never submits admin or api routes", async () => {
    const { sitemap } = await loadWith("0");
    const paths = sitemap.map((e) => new URL(e.url).pathname);
    expect(paths.some((p) => p.startsWith("/admin"))).toBe(false);
    expect(paths.some((p) => p.startsWith("/api"))).toBe(false);
  });

  it("blocks the private surfaces in robots", async () => {
    const { robots } = await loadWith("0");
    const rules = robots.rules as { allow: string; disallow: string[] };
    expect(rules.allow).toBe("/");
    // /portal holds children's fee and attendance records behind a parent
    // login. Crawlers get nothing useful from it and it must never be indexed.
    expect(rules.disallow).toEqual(["/admin", "/api", "/portal"]);
  });

  it("treats an unset flag as live, not gated", async () => {
    const { sitemap } = await loadWith(undefined);
    expect(sitemap.length).toBeGreaterThan(1);
  });
});
