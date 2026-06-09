import { test, expect } from "@playwright/test";

// Storefront smoke tests — verify each public page renders its stable shell.
// NOTE: assertions target always-present structural elements (headings, regions)
// rather than seeded product/category content, so the suite is green with an
// empty database. With seed data, the grids/cards populate automatically.

test.describe("Storefront smoke", () => {
  test("home page shows the hero heading", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // The hero is a rotating carousel, so assert the level-1 heading renders
    // rather than one slide's marketing copy (which changes with content).
    await expect(
      page.getByRole("heading", { level: 1 }).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test("products page renders the listing with a product region", async ({
    page,
  }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
    // The grid region is always present — either populated cards or the
    // "No products found" empty state.
    await expect(
      page.locator("article").first().or(page.getByText(/no products found/i))
    ).toBeVisible();
  });

  test("cart page shows the 'Shopping Cart' heading", async ({ page }) => {
    await page.goto("/cart", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(
      page.getByRole("heading", { name: /shopping cart/i })
    ).toBeVisible();
  });

  test("shop page shows the category browse heading", async ({ page }) => {
    await page.goto("/shop");
    await expect(
      page.getByRole("heading", { name: "Shop by Category" })
    ).toBeVisible();
    // Category cards (links) or the empty state — whichever the data yields.
    await expect(
      page
        .locator('a[href^="/products?categoryId="]')
        .first()
        .or(page.getByText(/no categories yet/i))
    ).toBeVisible();
  });
});
