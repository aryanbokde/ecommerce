import { expect, test } from "@playwright/test";

test("home page renders the storefront placeholder", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});
