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
    // The header's CategoryNav fetches /api/categories client-side; that route
    // cold-compiles on first hit (webpack cache is disabled in next.config.ts),
    // so give the <nav> generous time to appear.
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 30_000 });
  });
});
