import { test, expect, type Page } from "@playwright/test";

// Shop-manager area smoke test. Login goes through the API (Playwright shares
// the cookie jar) to dodge dev-mode hydration races on the login form. Uses the
// seeded manager (manager@shop.com) and customer (customer@shop.com); the password
// for all seeded accounts is "Password123!".
//
// NOTE: manager URLs live under /shop-manager/* (the (shop-manager) route group
// keeps the prefix so it never collides with admin's /dashboard).

async function login(page: Page, email: string) {
  const res = await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: "http://127.0.0.1:3000" },
    data: { email, password: "Password123!" },
    timeout: 120_000,
  });
  expect(
    res.ok(),
    `login failed for ${email}: ${res.status()} ${await res.text()}`
  ).toBeTruthy();
}

test.describe("Shop manager smoke", () => {
  test.setTimeout(120_000);

  test("dashboard shows the operational stat cards", async ({ page }) => {
    await login(page, "manager@shop.com");
    await page.goto("/shop-manager/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await expect(page).toHaveURL(/\/shop-manager\/dashboard$/);
    // Scope to <main> — "Low Stock"/"Orders to Fulfill" also appear in the
    // sidebar nav. "Shipped Today" is card-only; "Out of Stock" needs an exact
    // match so it doesn't also catch the "Out of stock" stock badges.
    const main = page.getByRole("main");
    await expect(main.getByText("Shipped Today")).toBeVisible();
    await expect(main.getByText("Out of Stock", { exact: true })).toBeVisible();
  });

  test("inventory page renders rows with stock badges", async ({ page }) => {
    await login(page, "manager@shop.com");
    await page.goto("/shop-manager/inventory", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    // Data is fetched client-side and the API route compiles on first hit.
    await expect(page.getByRole("table")).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("columnheader", { name: "Stock" })
    ).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("adjust dialog restock applies a stock change", async ({ page }) => {
    await login(page, "manager@shop.com");
    await page.goto("/shop-manager/inventory");

    // Wait for the inventory table to render and show real rows (not skeletons).
    // This avoids racing the client fetch / cold API compile before targeting
    // the row action trigger which is an icon-only button not surfaced in the
    // a11y tree — we then target its aria-label in the DOM.
    await expect(page.getByRole("table")).toBeVisible({ timeout: 30_000 });
    const actions = page.locator('tbody [aria-label="Actions"]').first();
    await expect(actions).toBeVisible({ timeout: 30_000 });

    // Open the row action menu → Adjust stock (restock is the default type).
    await actions.click();
    await page.getByRole("menuitem", { name: /Adjust stock/i }).click();

    const dialog = page.getByRole("dialog");
    const apply = dialog.getByRole("button", { name: /Apply adjustment/i });
    await expect(apply).toBeVisible();

    // Bump the quantity, then apply. The dialog closes only on a successful
    // adjustment (it stays open and shows an error toast otherwise), so the
    // close is a robust success signal — and it absorbs a cold POST compile,
    // unlike the success toast which Sonner auto-dismisses after a few seconds.
    await dialog.getByRole("button", { name: "Increase" }).click();
    await dialog.getByRole("button", { name: "Increase" }).click();
    await apply.click();

    await expect(dialog).toBeHidden({ timeout: 30_000 });
  });

  test("fulfillment board renders its pipeline columns", async ({ page }) => {
    await login(page, "manager@shop.com");
    await page.goto("/shop-manager/orders", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await expect(
      page.getByRole("heading", { name: "Orders to Fulfill" })
    ).toBeVisible();
    // The three pre-shipment columns always render.
    await expect(page.getByText("To Confirm")).toBeVisible();
    await expect(page.getByText("To Pack")).toBeVisible();
    await expect(page.getByText("To Ship")).toBeVisible();
    // Seeded data leaves orders in these statuses → at least one card. The
    // board fetches client-side, and this API route compiles on first hit, so
    // allow well beyond the 5s default for the queue to populate.
    // The board populates via a client fetch and may take longer on cold
    // compiles or under CI; allow a more generous timeout for the first
    // visible order card.
    await expect(page.getByText(/ORD-/).first()).toBeVisible({ timeout: 60_000 });
  });

  test("a customer is redirected to /403", async ({ page }) => {
    await login(page, "customer@shop.com");
    await page.goto("/shop-manager/dashboard");
    await expect(page).toHaveURL(/\/403$/);
  });
});
