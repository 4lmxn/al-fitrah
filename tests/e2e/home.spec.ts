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

  // Fail on any unexpected asset 404 (ignore RSC prefetch noise).
  const unexpected404s: string[] = [];
  page.on("response", (r) => {
    if (r.status() === 404 && !r.url().includes("_rsc=")) unexpected404s.push(r.url());
  });

  await page.goto("/");
  await expect(page.getByTestId("hero")).toBeVisible();
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByRole("link", { name: "Begin your child's path" })).toBeVisible();
  await expect(page.getByTestId("cta-band")).toBeVisible();
  await expect(page.locator("footer")).toContainText("Al Fitrah");
  expect(consoleErrors).toEqual([]);
  expect(unexpected404s).toEqual([]);
});

test("mobile nav toggles", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  // The trigger is labelled by its visible text ("Menu" / "Close"), not an
  // aria-label, so match on aria-controls — the name flips with state.
  const toggle = page.locator('button[aria-controls="mobile-nav"]');
  await expect(toggle).toHaveAccessibleName("Menu");
  await toggle.click();
  const mobileNav = page.getByRole("navigation", { name: "Mobile" });
  await expect(mobileNav).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Escape");
  await expect(mobileNav).toBeHidden();
});
