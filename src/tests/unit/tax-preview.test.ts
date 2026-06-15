import { describe, it, expect } from "vitest";
import { Prisma } from "@/generated/prisma";
import {
  computeLineTaxes,
  resolveTaxRate,
  type TaxContext,
  type TaxCategoryNode,
} from "@/lib/tax";
import { previewTax } from "@/lib/tax-preview";

const D = (v: number | string) => new Prisma.Decimal(v);

function ctx(enabled = true): TaxContext {
  const categories = new Map<string, TaxCategoryNode>([
    ["electronics", { taxRate: D(18), parentId: null }],
    ["phones", { taxRate: null, parentId: "electronics" }], // inherits 18
    ["books", { taxRate: D(0), parentId: null }],
  ]);
  return { enabled, defaultRate: D(18), categories };
}

// Parity: the cart API resolves each item's EFFECTIVE rate server-side; the
// browser preview (previewTax) then sums round2(lineTotal × rate/100). That must
// equal the server's computeLineTaxes for the same cart, so the number the buyer
// sees == the tax persisted on the order.
describe("cart preview ↔ server tax parity", () => {
  const cart = [
    { price: 1383, qty: 3, productRate: null, categoryId: "phones" }, // 18%
    { price: 1297, qty: 1, productRate: D(0), categoryId: "books" }, //  0% override
    { price: 500, qty: 2, productRate: null, categoryId: "books" }, //  0% category
    { price: 200, qty: 4, productRate: D(5), categoryId: "electronics" }, //  5%
    { price: 999, qty: 1, productRate: null, categoryId: null }, // 18% default
  ];

  function run(c: TaxContext) {
    const lines = cart.map((i) => ({
      lineTotal: D(i.price).mul(i.qty),
      productRate: i.productRate,
      categoryId: i.categoryId,
    }));
    const server = computeLineTaxes(lines, c).tax;

    // What the cart API sends to the browser = the effective rate per item.
    const previewItems = cart.map((i) => ({
      quantity: i.qty,
      product: {
        price: i.price,
        taxRate: resolveTaxRate(i.productRate, i.categoryId, c).toFixed(2),
      },
    }));
    const preview = previewTax(previewItems);
    return { server: server.toFixed(2), preview: preview.toFixed(2) };
  }

  it("matches with tax enabled (mixed rates)", () => {
    const { server, preview } = run(ctx(true));
    expect(preview).toBe(server);
  });

  it("matches with tax disabled (both 0)", () => {
    const { server, preview } = run(ctx(false));
    expect(preview).toBe("0.00");
    expect(server).toBe("0.00");
  });
});
