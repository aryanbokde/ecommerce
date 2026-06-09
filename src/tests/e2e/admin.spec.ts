import { test, expect, type Page } from "@playwright/test";

// Admin area smoke test. Login goes through the API (Playwright shares the
// cookie jar) to avoid dev-mode hydration races on the login form. Uses the
// seeded admin (admin@shop.com) and customer (customer@shop.com); password for all
// seeded accounts is "Password123!".
//
// NOTE: admin URLs live under /dashboard/* (the (admin) route group strips the
// segment) — NOT /admin/dashboard/*.

async function login(page: Page, email: string) {
  const res = await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: "http://127.0.0.1:3000" },
    data: { email, password: "Password123!" },
  });
  expect(
    res.ok(),
    `login failed for ${email}: ${res.status()} ${await res.text()}`
  ).toBeTruthy();
}

test.describe("Admin dashboard smoke", () => {
  test.setTimeout(120_000);

  test("admin sees the overview stat cards", async ({ page }) => {
    await login(page, "admin@shop.com");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Total Orders")).toBeVisible();
    await expect(page.getByText("Revenue (30 days)")).toBeVisible();
  });

  test("products page renders a table with rows", async ({ page }) => {
    await login(page, "admin@shop.com");
    await page.goto("/dashboard/products");
    await expect(
      page.getByRole("button", { name: /Add Product/i })
    ).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("orders page renders a table", async ({ page }) => {
    await login(page, "admin@shop.com");
    await page.goto("/dashboard/orders");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("non-admin is redirected to /403", async ({ page }) => {
    await login(page, "customer@shop.com");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/403$/);
  });
});
