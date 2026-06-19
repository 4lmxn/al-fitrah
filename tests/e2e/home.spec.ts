// tests/e2e/home.spec.ts
import { test, expect } from "@playwright/test";

test("home renders hero, h1, CTAs, footer; no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto("/");
  await expect(page.getByTestId("hero")).toBeVisible();
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByRole("link", { name: "Apply for Admission" })).toBeVisible();
  await expect(page.getByTestId("admission-cta")).toBeVisible();
  await expect(page.locator("footer")).toContainText("Al Fitrah");
  expect(errors).toEqual([]);
});

test("mobile nav toggles", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
});
