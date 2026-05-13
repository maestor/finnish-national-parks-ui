import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Suomen kansallispuistot/);
  await expect(
    page.getByRole("application", { name: /Suomen kansallispuistojen kartta/i }),
  ).toBeVisible();
});

test("control panel page loads", async ({ page }) => {
  await page.goto("/control-panel");
  await expect(page).toHaveTitle(/Hallintapaneeli/);
  await expect(page.getByRole("heading", { name: /Yleiskatsaus/i })).toBeVisible();
});

test("not found page works", async ({ page }) => {
  await page.goto("/non-existent-page");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
});
