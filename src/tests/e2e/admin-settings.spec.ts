import { test, expect, type Page } from "@playwright/test";

// Admin settings + email-template control, end to end.
//
// NOTE: the "delivered status change → skipped" and "test email arrives with new
// subject" assertions in the brief depend on external state (Mailtrap inbox, an
// order-status trigger). Those paths are covered deterministically by the unit
// tests (email-template.service.test.ts: sendEmail skips a disabled template +
// replaces {orderNumber} tokens). Here we verify the admin-facing UI flows that
// are reliable in a browser: settings persist, the storefront reflects branding,
// and templates can be toggled / edited / test-sent.

const ADMIN = { email: "admin@shop.com", password: "Password123!" };
const NEW_NAME = `QA Store ${Date.now()}`;

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"], input[type="email"]').fill(ADMIN.email);
  await page.locator('input[name="password"], input[type="password"]').fill(ADMIN.password);
  await page.locator('button[type="submit"]').click();
  // Leave the login page once the session is established.
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
  });
}

test.describe.configure({ mode: "serial" });

test("admin: store settings persist + storefront reflects, email templates toggle/edit", async ({
  page,
}) => {
  await login(page);

  // ── Store Settings: change name → save → reload → persists ──────────────────
  await page.goto("/dashboard/settings/shop");
  const nameInput = page.locator("#set-storeName");
  await expect(nameInput).toBeVisible();
  const original = (await nameInput.inputValue()) || "MyShop";

  await nameInput.fill(NEW_NAME);
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByText(/settings saved/i)).toBeVisible({ timeout: 15_000 });

  await page.reload();
  await expect(page.locator("#set-storeName")).toHaveValue(NEW_NAME);

  // ── Storefront header reflects the new store name ───────────────────────────
  // In a prod build the home route is cached; revalidatePath() serves stale once
  // then regenerates, so re-fetch until the new branding appears.
  await expect(async () => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("header")).toContainText(NEW_NAME);
  }).toPass({ timeout: 30_000 });

  // ── Email Templates: Order tab → toggle order_delivered off ─────────────────
  await page.goto("/dashboard/settings/email");
  await page.getByRole("tab", { name: /order/i }).click();

  const deliveredCard = page
    .locator("text=Order Delivered")
    .locator("xpath=ancestor::*[@data-slot='card']")
    .first();
  await expect(deliveredCard).toBeVisible();

  const toggle = deliveredCard.getByRole("switch");
  await toggle.click();
  await expect(deliveredCard.getByText(/^off$/i)).toBeVisible({ timeout: 10_000 });

  // Toggle back on (restore).
  await toggle.click();
  await expect(deliveredCard.getByText(/^off$/i)).toHaveCount(0, { timeout: 10_000 });

  // ── Edit order_confirmed subject → Send test ────────────────────────────────
  const confirmedCard = page
    .locator("text=Order Confirmed")
    .locator("xpath=ancestor::*[@data-slot='card']")
    .first();
  await confirmedCard.getByRole("button", { name: /edit/i }).click();

  const subject = page.locator("#tpl-subject");
  await expect(subject).toBeVisible();
  const newSubject = `Order {orderNumber} confirmed — QA ${Date.now()}`;
  await subject.fill(newSubject);
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByText(/template saved/i)).toBeVisible({ timeout: 15_000 });

  // Send test of order_confirmed → success toast (delivery covered by unit tests).
  await confirmedCard.getByRole("button", { name: /send test/i }).click();
  await expect(page.getByText(/test email sent to/i)).toBeVisible({ timeout: 20_000 });

  // ── Restore: store name back to original ────────────────────────────────────
  await page.goto("/dashboard/settings/shop");
  await page.locator("#set-storeName").fill(original);
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByText(/settings saved/i)).toBeVisible({ timeout: 15_000 });
});
