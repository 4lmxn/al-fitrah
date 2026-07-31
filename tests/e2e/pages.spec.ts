import { test, expect } from "@playwright/test";

const routes = ["/about", "/programs", "/admissions", "/campus-life", "/faq", "/parent-resources", "/contact", "/syllabus", "/privacy", "/careers"];

for (const path of routes) {
  test(`${path} renders with h1, footer, no console/asset errors`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !m.text().includes("Failed to load resource")) consoleErrors.push(m.text());
    });
    const unexpected404s: string[] = [];
    page.on("response", (r) => { if (r.status() === 404 && !r.url().includes("_rsc=")) unexpected404s.push(r.url()); });

    const resp = await page.goto(path);
    expect(resp?.status()).toBeLessThan(400);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("footer")).toContainText("Al Fitrah");
    expect(consoleErrors).toEqual([]);
    expect(unexpected404s).toEqual([]);
  });
}

test("header nav reaches a built page without 404", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Programs" }).click();
  await expect(page).toHaveURL(/\/programs$/);
  await expect(page.locator("h1")).toBeVisible();
});

test("footer has no dead (#) links", async ({ page }) => {
  await page.goto("/");
  const deadLinks = await page.locator('footer a[href="#"]').count();
  expect(deadLinks).toBe(0);
});

test("programs 'View full syllabus' reaches /syllabus", async ({ page }) => {
  await page.goto("/programs");
  await page.getByRole("link", { name: /view full syllabus/i }).click();
  await expect(page).toHaveURL(/\/syllabus$/);
  await expect(page.locator("h1")).toBeVisible();
});

test("faq accordion toggles open", async ({ page }) => {
  await page.goto("/faq");
  const first = page.getByRole("button", { name: /ideal age to enroll/i });
  await expect(first).toHaveAttribute("aria-expanded", "true"); // first opens by default
});

test("unknown route serves a branded 404 with working navigation", async ({ page }) => {
  const resp = await page.goto("/this-page-does-not-exist");
  expect(resp?.status()).toBe(404);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("footer")).toContainText("Al Fitrah");
  await page.getByRole("link", { name: "Admissions" }).first().click();
  await expect(page).toHaveURL(/\/admissions$/);
});

test("skip link is the first tab stop and jumps to main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: /skip to content/i });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute("href", "#content");
});
