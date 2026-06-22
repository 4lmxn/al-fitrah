import { test, expect } from "@playwright/test";

test("careers form renders with required fields", async ({ page }) => {
  await page.goto("/careers");
  await expect(page.getByTestId("careers-form")).toBeVisible();
  await expect(page.locator("#cv")).toBeVisible();
  await expect(page.locator("#role")).toBeVisible();
});

test("careers form blocks submit with no CV", async ({ page }) => {
  await page.goto("/careers");
  await page.fill("#name", "Test Applicant");
  await page.fill("#phone", "9998887777");
  await page.selectOption("#role", { index: 1 });
  await page.getByRole("button", { name: /submit application/i }).click();
  await expect(page.getByTestId("careers-form").getByRole("alert")).toContainText(/attach your CV/i);
});
