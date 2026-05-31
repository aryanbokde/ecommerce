import { test, expect } from "@playwright/test";

test.describe("Home page smoke", () => {
  test("returns HTTP 200", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("page title matches site name", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/MyShop/i);
  });

  test("renders a <nav> landmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav").first()).toBeVisible();
  });
});
