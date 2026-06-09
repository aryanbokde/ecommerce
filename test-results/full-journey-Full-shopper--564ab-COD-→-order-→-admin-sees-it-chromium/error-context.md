# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-journey.spec.ts >> Full shopper journey >> browse → cart → checkout(COD) → order → admin sees it
- Location: src\tests\e2e\full-journey.spec.ts:11:7

# Error details

```
TimeoutError: locator.textContent: Timeout 30000ms exceeded.
Call log:
  - waiting for getByText(/ORD-[A-Z0-9]+/).first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "MyShop" [ref=e6] [cursor=pointer]:
          - /url: /
        - navigation "Primary" [ref=e7]:
          - navigation [ref=e8]:
            - list [ref=e9]:
              - listitem [ref=e10]:
                - link "Electronics" [ref=e11] [cursor=pointer]:
                  - /url: /shop?category=electronics
              - listitem [ref=e12]:
                - link "Fashion" [ref=e13] [cursor=pointer]:
                  - /url: /shop?category=fashion
              - listitem [ref=e14]:
                - link "Home & Kitchen" [ref=e15] [cursor=pointer]:
                  - /url: /shop?category=home-kitchen
              - listitem [ref=e16]:
                - link "Books" [ref=e17] [cursor=pointer]:
                  - /url: /shop?category=books
        - generic [ref=e18]:
          - button "Search products" [ref=e19] [cursor=pointer]:
            - img
          - button "Cart" [ref=e20] [cursor=pointer]:
            - img
          - button "TC" [ref=e21]:
            - generic [ref=e23]: TC
    - main [ref=e24]:
      - generic [ref=e25]:
        - link "My Orders" [ref=e26] [cursor=pointer]:
          - /url: /orders
          - img [ref=e27]
          - text: My Orders
        - generic [ref=e29]:
          - img [ref=e33]
          - generic [ref=e36]:
            - paragraph [ref=e37]: Order placed successfully!
            - paragraph [ref=e38]: Your order number is ORD-_PYMTSU_.
        - generic [ref=e39]:
          - heading "Order ORD-_PYMTSU_" [level=1] [ref=e40]
          - paragraph [ref=e41]: Placed 9 June 2026 at 04:50 am
        - generic [ref=e42]:
          - heading "Order status" [level=2] [ref=e43]
          - list [ref=e44]:
            - listitem [ref=e45]:
              - generic [ref=e47]: "1"
              - generic [ref=e50]: Pending
            - listitem [ref=e51]:
              - generic [ref=e53]: "2"
              - generic [ref=e55]: Confirmed
            - listitem [ref=e56]:
              - generic [ref=e58]: "3"
              - generic [ref=e60]: Processing
            - listitem [ref=e61]:
              - generic [ref=e63]: "4"
              - generic [ref=e65]: Shipped
            - listitem [ref=e66]:
              - generic [ref=e68]: "5"
              - generic [ref=e69]: Delivered
        - generic [ref=e70]:
          - generic [ref=e72]:
            - heading "Items (1)" [level=2] [ref=e73]
            - list [ref=e74]:
              - listitem [ref=e75]:
                - generic [ref=e77]:
                  - paragraph [ref=e78]: OnePlus Neo 5G 128GB
                  - paragraph [ref=e79]: ₹79,160 × 1
                - generic [ref=e80]: ₹79,160
          - complementary [ref=e81]:
            - generic [ref=e82]:
              - heading "Summary" [level=2] [ref=e83]
              - generic [ref=e84]:
                - generic [ref=e85]:
                  - term [ref=e86]: Subtotal
                  - definition [ref=e87]: ₹79,160
                - generic [ref=e88]:
                  - term [ref=e89]: Shipping
                  - definition [ref=e90]: Free
                - generic [ref=e91]:
                  - term [ref=e92]: Tax
                  - definition [ref=e93]: ₹14,248.8
              - separator [ref=e94]
              - generic [ref=e95]:
                - generic [ref=e96]: Total
                - generic [ref=e97]: ₹93,408.8
            - generic [ref=e98]:
              - heading "Payment" [level=2] [ref=e99]:
                - img [ref=e100]
                - text: Payment
              - generic [ref=e102]:
                - generic [ref=e103]: Cash on Delivery
                - generic [ref=e104]: unpaid
            - generic [ref=e105]:
              - heading "Delivery address" [level=2] [ref=e106]:
                - img [ref=e107]
                - text: Delivery address
              - generic [ref=e110]:
                - paragraph [ref=e111]:
                  - text: Dr. Mabel Legros
                  - generic [ref=e112]: (Home)
                - paragraph [ref=e113]: 228 Buford Mountains, Walkerboro, Madhya Pradesh, 341511, IN
                - paragraph [ref=e114]: "+919732906829"
        - generic [ref=e115]:
          - button "Download Invoice" [ref=e116]:
            - img
            - text: Download Invoice
          - button "Track Order" [ref=e117] [cursor=pointer]:
            - img
            - text: Track Order
          - button "Contact Support" [ref=e118] [cursor=pointer]:
            - img
            - text: Contact Support
    - contentinfo [ref=e119]:
      - generic [ref=e120]:
        - generic [ref=e121]:
          - generic [ref=e122]:
            - text: MyShop
            - paragraph [ref=e123]: Quality products, fair prices, delivered to your door. Shop the latest with confidence.
            - paragraph [ref=e124]: Bengaluru, Karnataka, India
          - generic [ref=e125]:
            - heading "Shop" [level=3] [ref=e126]
            - list [ref=e127]:
              - listitem [ref=e128]:
                - link "All Products" [ref=e129] [cursor=pointer]:
                  - /url: /products
              - listitem [ref=e130]:
                - link "Shop" [ref=e131] [cursor=pointer]:
                  - /url: /shop
              - listitem [ref=e132]:
                - link "Featured" [ref=e133] [cursor=pointer]:
                  - /url: /shop?featured=true
          - generic [ref=e134]:
            - heading "Help" [level=3] [ref=e135]
            - list [ref=e136]:
              - listitem [ref=e137]:
                - link "Contact Us" [ref=e138] [cursor=pointer]:
                  - /url: /contact
              - listitem [ref=e139]:
                - link "Returns" [ref=e140] [cursor=pointer]:
                  - /url: /returns
              - listitem [ref=e141]:
                - link "Shipping Policy" [ref=e142] [cursor=pointer]:
                  - /url: /shipping
          - generic [ref=e143]:
            - heading "Legal" [level=3] [ref=e144]
            - list [ref=e145]:
              - listitem [ref=e146]:
                - link "Privacy Policy" [ref=e147] [cursor=pointer]:
                  - /url: /privacy
              - listitem [ref=e148]:
                - link "Terms of Service" [ref=e149] [cursor=pointer]:
                  - /url: /terms
        - paragraph [ref=e151]: © 2026 MyShop. All rights reserved.
  - region "Notifications alt+T"
  - alert [ref=e152]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | // End-to-end journey: browse → cart → checkout (COD) → order → admin sees it.
  4  | // Login + cart setup go through the API (Playwright shares the cookie jar) so
  5  | // the test exercises the real checkout UI rather than fighting dev-mode
  6  | // hydration. Uses the seeded customer customer@shop.com and admin admin@shop.com
  7  | // (password Password123!). Runs most reliably single-worker (cold dev compiles).
  8  | test.describe("Full shopper journey", () => {
  9  |   test.setTimeout(180_000);
  10 | 
  11 |   test("browse → cart → checkout(COD) → order → admin sees it", async ({
  12 |     page,
  13 |   }) => {
  14 |     // 1. Browse the storefront.
  15 |     await page.goto("/products");
  16 |     await expect(page).toHaveURL(/\/products(\?|$)/);
  17 | 
  18 |     // 2. Log in as the seeded customer.
  19 |     const login = await page.request.post("/api/auth/sign-in/email", {
  20 |       headers: { Origin: "http://127.0.0.1:3000" },
  21 |       data: { email: "customer@shop.com", password: "Password123!" },
  22 |     });
  23 |     expect(login.ok(), `login failed: ${login.status()}`).toBeTruthy();
  24 | 
  25 |     // 3. Add an in-stock product to the cart (API).
  26 |     const prodRes = await page.request.get("/api/products?limit=50");
  27 |     const products = (await prodRes.json()).data.products as {
  28 |       id: string;
  29 |       stock: number;
  30 |       isActive: boolean;
  31 |     }[];
  32 |     const inStock = products.find((p) => p.stock > 0 && p.isActive);
  33 |     expect(inStock, "expected an active, in-stock product").toBeTruthy();
  34 |     const added = await page.request.post("/api/cart/items", {
  35 |       data: { productId: inStock!.id, quantity: 1 },
  36 |     });
  37 |     expect(added.ok(), `add to cart failed: ${added.status()}`).toBeTruthy();
  38 | 
  39 |     // 4. Checkout — address step.
  40 |     await page.goto("/checkout");
  41 |     await expect(page).toHaveURL(/\/checkout(\?|$)/, { timeout: 15_000 });
  42 |     const toPayment = page.getByRole("button", { name: /continue to payment/i });
  43 |     await expect(toPayment).toBeEnabled({ timeout: 30_000 });
  44 |     await toPayment.click();
  45 | 
  46 |     // 5. Payment step → Cash on Delivery → Review.
  47 |     await page.getByText("Cash on Delivery").click();
  48 |     await page.getByRole("button", { name: /continue to review/i }).click();
  49 | 
  50 |     // 6. Place the order.
  51 |     await page.getByRole("button", { name: /^place order$/i }).click();
  52 |     await page.waitForURL(/\/orders\/[^/?]+/, { timeout: 60_000 });
  53 |     await expect(
  54 |       page.getByText(/order placed successfully/i)
  55 |     ).toBeVisible({ timeout: 30_000 });
  56 | 
  57 |     // 7. Capture the order number from the confirmation.
  58 |     const orderText = await page
  59 |       .getByText(/ORD-[A-Z0-9]+/)
  60 |       .first()
> 61 |       .textContent();
     |        ^ TimeoutError: locator.textContent: Timeout 30000ms exceeded.
  62 |     const orderNumber = orderText?.match(/ORD-[A-Z0-9]+/)?.[0];
  63 |     expect(orderNumber, "expected an order number on the confirmation").toBeTruthy();
  64 | 
  65 |     // 8. Admin sees the new order (re-login as admin via the shared cookie jar).
  66 |     const adminLogin = await page.request.post("/api/auth/sign-in/email", {
  67 |       headers: { Origin: "http://127.0.0.1:3000" },
  68 |       data: { email: "admin@shop.com", password: "Password123!" },
  69 |     });
  70 |     expect(adminLogin.ok(), `admin login failed: ${adminLogin.status()}`).toBeTruthy();
  71 | 
  72 |     await page.goto("/dashboard/orders");
  73 |     // Exact match: the topbar's "Search admin" box also matches a loose "Search".
  74 |     await page.getByLabel("Search", { exact: true }).fill(orderNumber!);
  75 |     await expect(page.getByText(orderNumber!).first()).toBeVisible({
  76 |       timeout: 30_000,
  77 |     });
  78 |   });
  79 | });
  80 | 
```