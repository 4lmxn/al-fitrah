// tests/e2e/home.spec.ts
import { test, expect } from "@playwright/test";

test("home renders hero, h1, CTAs, footer; no console errors", async ({ page }) => {
  // Real JS console errors must stay empty. "Failed to load resource" lines are
  // network failures, asserted separately below so we can ignore expected ones.
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Failed to load resource")) {
      consoleErrors.push(m.text());
    }
  });

  // Next.js App Router prefetches every <Link>. Nav targets (/about, /programs,
  // /admissions, …) are built in a later plan, so their RSC prefetch 404s are
  // expected for now. Fail on any OTHER 404 (real broken assets).
  const unexpected404s: string[] = [];
  page.on("response", (r) => {
    if (r.status() === 404 && !r.url().includes("_rsc=")) unexpected404s.push(r.url());
  });

  await page.goto("/");
  await expect(page.getByTestId("hero")).toBeVisible();
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByRole("link", { name: "Apply for Admission" })).toBeVisible();
  await expect(page.getByTestId("admission-cta")).toBeVisible();
  await expect(page.locator("footer")).toContainText("Al Fitrah");
  expect(consoleErrors).toEqual([]);
  expect(unexpected404s).toEqual([]);
});

test("mobile nav toggles", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
});
