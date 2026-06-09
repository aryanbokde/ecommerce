import { test, expect } from "@playwright/test";

// Full checkout happy-path via Cash on Delivery (avoids the real payment
// gateway). Login + cart setup go through the API (Playwright shares the
// cookie jar) so the test reliably exercises the CHECKOUT UI rather than
// fighting dev-mode hydration on the login/listing pages. Uses the seeded,
// verified customer customer@shop.com (password Password123!) who has a default
// address.
test.describe("Checkout flow (COD)", () => {
  test.setTimeout(120_000);

  test("customer can place a COD order end to end", async ({ page }) => {
    // 1. Log in (seeded verified customer).
    const login = await page.request.post("/api/auth/sign-in/email", {
      headers: { Origin: "http://127.0.0.1:3000" },
      data: { email: "customer@shop.com", password: "Password123!" },
    });
    expect(
      login.ok(),
      `login failed: ${login.status()} ${await login.text()}`
    ).toBeTruthy();

    // 2. Put an in-stock product in the cart.
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
    expect(
      added.ok(),
      `add to cart failed: ${added.status()} ${await added.text()}`
    ).toBeTruthy();

    // 3. Checkout — Address step is active.
    await page.goto("/checkout");
    await expect(page, "should stay on /checkout (auth + non-empty cart)").toHaveURL(
      /\/checkout(\?|$)/,
      { timeout: 15_000 }
    );
    await expect(
      page.getByRole("heading", { name: /delivery address/i })
    ).toBeVisible({ timeout: 30_000 });

    // 4. Default address auto-selects (button enables once the client loads it).
    const toPayment = page.getByRole("button", { name: /continue to payment/i });
    await expect(toPayment).toBeEnabled({ timeout: 20_000 });
    await toPayment.click();

    // 5. Payment step → choose Cash on Delivery → Review.
    await expect(
      page.getByRole("heading", { name: /payment method/i })
    ).toBeVisible();
    await page.getByText("Cash on Delivery").click();
    await page.getByRole("button", { name: /continue to review/i }).click();

    // 6. Review step → place the COD order.
    await expect(
      page.getByRole("heading", { name: /review your order/i })
    ).toBeVisible();
    await page.getByRole("button", { name: /^place order$/i }).click();

    // 7. Redirected to the order detail with the success banner.
    //    /orders/[id] cold-compiles on first navigation in dev, so allow time.
    await page.waitForURL(/\/orders\/[^/?]+/, { timeout: 60_000 });
    await expect(
      page.getByText(/order placed successfully/i)
    ).toBeVisible({ timeout: 30_000 });
  });
});
