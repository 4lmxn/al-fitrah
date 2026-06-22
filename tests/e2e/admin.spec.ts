import { test, expect } from "@playwright/test";

test("/admin redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByTestId("google-signin")).toBeVisible();
});

test("/admin/leads/x redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/admin/leads/some-id");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("login page renders the Google button", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByTestId("google-signin")).toBeVisible();
});
