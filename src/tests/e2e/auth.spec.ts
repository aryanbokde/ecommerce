import { test, expect } from "@playwright/test";

test.describe("Login page smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders an email input", async ({ page }) => {
    await expect(
      page.locator('input[type="email"], input[name="email"]')
    ).toBeVisible();
  });

  test("renders a password input", async ({ page }) => {
    await expect(
      page.locator('input[type="password"], input[name="password"]')
    ).toBeVisible();
  });

  test("renders a submit button", async ({ page }) => {
    await expect(
      page.locator('button[type="submit"]')
    ).toBeVisible();
  });
});

test.describe("Auth redirects (legacy /auth/* aliases)", () => {
  test("/auth/login redirects to /login", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("/auth/register redirects to /register", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page).toHaveURL(/\/register$/);
  });
});
