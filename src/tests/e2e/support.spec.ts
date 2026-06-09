import { test, expect, type Page } from "@playwright/test";

// Support area smoke test. Login goes through the API (Playwright shares the
// cookie jar). Uses the seeded support agent (support@shop.com) and customer
// (customer@shop.com); the password for all seeded accounts is "Password123!".
//
// Support is strictly read-only triage with a few limited order actions. URLs
// live under /support/* (the (support) route group keeps the prefix).

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

test.describe("Support smoke", () => {
  test.setTimeout(120_000);

  test("dashboard shows the support stat cards", async ({ page }) => {
    await login(page, "support@shop.com");
    await page.goto("/support/dashboard");
    await expect(page).toHaveURL(/\/support\/dashboard$/);
    const main = page.getByRole("main");
    await expect(main.getByText("Orders Today")).toBeVisible();
    await expect(main.getByText("Shipped Today")).toBeVisible();
  });

  test("order lookup → detail → add note appears in the thread", async ({
    page,
  }) => {
    await login(page, "support@shop.com");
    await page.goto("/support/orders");

    // Open the first order (list loads client-side; the API may compile cold).
    const firstOrder = page.getByRole("link", { name: /^ORD-/ }).first();
    await expect(firstOrder).toBeVisible({ timeout: 30_000 });
    await firstOrder.click();

    await expect(
      page.getByRole("heading", { name: /^Order ORD-/ })
    ).toBeVisible({ timeout: 30_000 });

    // Add an internal note via the limited action → it should appear in the thread.
    const noteText = `E2E note ${Date.now()}`;
    await page.getByRole("button", { name: "Add note" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").fill(noteText);
    await dialog.getByRole("button", { name: "Add note" }).click();

    await expect(page.getByText(noteText)).toBeVisible({ timeout: 30_000 });
  });

  test("customer lookup is read-only (no edit controls)", async ({ page }) => {
    await login(page, "support@shop.com");
    await page.goto("/support/customers");

    // Target the table's own search box by placeholder (the topbar also has a
    // "Search" — keying off the placeholder avoids the ambiguity).
    await page.getByPlaceholder(/Search by name/i).fill("customer@shop.com");
    const row = page.getByRole("link", { name: /Test Customer/ }).first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.click();

    // Wait until we're actually on the detail route (it compiles cold), then
    // assert a read-only badge + Copy email and the absence of mutating controls.
    await expect(page).toHaveURL(/\/support\/customers\/[^/]+$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("button", { name: /Copy email/i })
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Read-only").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^(Save|Edit|Ban|Delete|Change role)/i })
    ).toHaveCount(0);
  });

  test("a customer is redirected away from /support", async ({ page }) => {
    await login(page, "customer@shop.com");
    await page.goto("/support/dashboard");
    await expect(page).toHaveURL(/\/403$/);
  });

  test("support is redirected away from /admin and /shop-manager", async ({
    page,
  }) => {
    await login(page, "support@shop.com");

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/403$/);

    await page.goto("/shop-manager/dashboard");
    await expect(page).toHaveURL(/\/403$/);
  });
});
