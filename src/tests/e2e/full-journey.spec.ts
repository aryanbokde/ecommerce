import { test, expect } from "@playwright/test";

// End-to-end journey: browse → cart → checkout (COD) → order → admin sees it.
// Login + cart setup go through the API (Playwright shares the cookie jar) so
// the test exercises the real checkout UI rather than fighting dev-mode
// hydration. Uses the seeded customer customer@shop.com and admin admin@shop.com
// (password Password123!). Runs most reliably single-worker (cold dev compiles).
test.describe("Full shopper journey", () => {
  test.setTimeout(180_000);

  test("browse → cart → checkout(COD) → order → admin sees it", async ({
    page,
  }) => {
    // 1. Browse the storefront.
    await page.goto("/products");
    await expect(page).toHaveURL(/\/products(\?|$)/);

    // 2. Log in as the seeded customer.
    const login = await page.request.post("/api/auth/sign-in/email", {
      headers: { Origin: "http://127.0.0.1:3000" },
      data: { email: "customer@shop.com", password: "Password123!" },
    });
    expect(login.ok(), `login failed: ${login.status()}`).toBeTruthy();

    // 3. Add an in-stock product to the cart (API).
    const prodRes = await page.request.get("/api/products?limit=50");
    const products = (await prodRes.json()).data.products as {
      id: string;
      stock: number;
      isActive: boolean;
    }[];
    const inStock = products.find((p) => p.stock > 0 && p.isActive);
    expect(inStock, "expected an active, in-stock product").toBeTruthy();
    const added = await page.request.post("/api/cart/items", {
      data: { productId: inStock!.id, quantity: 1 },
    });
    expect(added.ok(), `add to cart failed: ${added.status()}`).toBeTruthy();

    // 4. Checkout — address step.
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/checkout(\?|$)/, { timeout: 15_000 });
    const toPayment = page.getByRole("button", { name: /continue to payment/i });
    await expect(toPayment).toBeEnabled({ timeout: 30_000 });
    await toPayment.click();

    // 5. Payment step → Cash on Delivery → Review.
    await page.getByText("Cash on Delivery").click();
    await page.getByRole("button", { name: /continue to review/i }).click();

    // 6. Place the order.
    await page.getByRole("button", { name: /^place order$/i }).click();
    await page.waitForURL(/\/orders\/[^/?]+/, { timeout: 60_000 });
    await expect(
      page.getByText(/order placed successfully/i)
    ).toBeVisible({ timeout: 30_000 });

    // 7. Capture the order number from the confirmation.
    const orderText = await page
      .getByText(/ORD-[A-Z0-9]+/)
      .first()
      .textContent();
    const orderNumber = orderText?.match(/ORD-[A-Z0-9]+/)?.[0];
    expect(orderNumber, "expected an order number on the confirmation").toBeTruthy();

    // 8. Admin sees the new order (re-login as admin via the shared cookie jar).
    const adminLogin = await page.request.post("/api/auth/sign-in/email", {
      headers: { Origin: "http://127.0.0.1:3000" },
      data: { email: "admin@shop.com", password: "Password123!" },
    });
    expect(adminLogin.ok(), `admin login failed: ${adminLogin.status()}`).toBeTruthy();

    await page.goto("/dashboard/orders");
    // Exact match: the topbar's "Search admin" box also matches a loose "Search".
    await page.getByLabel("Search", { exact: true }).fill(orderNumber!);
    await expect(page.getByText(orderNumber!).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
