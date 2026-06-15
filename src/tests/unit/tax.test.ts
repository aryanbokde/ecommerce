import { describe, it, expect } from "vitest";
import { Prisma } from "@/generated/prisma";
import {
  resolveTaxRate,
  lineTaxAmount,
  computeLineTaxes,
  type TaxContext,
  type TaxCategoryNode,
} from "@/lib/tax";

const D = (v: number | string) => new Prisma.Decimal(v);

// Tree: electronics(18) → phones(null, inherits 18); books(0) → fiction(null → 0)
function ctx(
  overrides: Partial<TaxContext> = {},
  cats: Record<string, TaxCategoryNode> = {}
): TaxContext {
  const categories = new Map<string, TaxCategoryNode>([
    ["electronics", { taxRate: D(18), parentId: null }],
    ["phones", { taxRate: null, parentId: "electronics" }],
    ["books", { taxRate: D(0), parentId: null }],
    ["fiction", { taxRate: null, parentId: "books" }],
    ...Object.entries(cats),
  ]);
  return { enabled: true, defaultRate: D(18), categories, ...overrides };
}

describe("resolveTaxRate", () => {
  it("returns 0 when tax is globally disabled", () => {
    const r = resolveTaxRate(D(28), "electronics", ctx({ enabled: false }));
    expect(r.toNumber()).toBe(0);
  });

  it("uses the product override when set", () => {
    expect(resolveTaxRate(D(12), "electronics", ctx()).toNumber()).toBe(12);
  });

  it("honors a product rate of 0 (tax-free, not inherit)", () => {
    expect(resolveTaxRate(D(0), "electronics", ctx()).toNumber()).toBe(0);
  });

  it("inherits the product's own category rate", () => {
    expect(resolveTaxRate(null, "electronics", ctx()).toNumber()).toBe(18);
  });

  it("inherits the parent category when the child has no rate", () => {
    expect(resolveTaxRate(null, "phones", ctx()).toNumber()).toBe(18);
  });

  it("child category rate overrides parent (closest wins)", () => {
    const cats = { phones: { taxRate: D(12), parentId: "electronics" } };
    expect(resolveTaxRate(null, "phones", ctx({}, cats)).toNumber()).toBe(12);
  });

  it("inherits a parent rate of 0 (tax-free category tree)", () => {
    expect(resolveTaxRate(null, "fiction", ctx()).toNumber()).toBe(0);
  });

  it("falls back to the default when nothing in the chain sets a rate", () => {
    const cats = { misc: { taxRate: null, parentId: null } };
    expect(resolveTaxRate(null, "misc", ctx({}, cats)).toNumber()).toBe(18);
  });

  it("falls back to the default when categoryId is null", () => {
    expect(resolveTaxRate(null, null, ctx()).toNumber()).toBe(18);
  });
});

describe("lineTaxAmount", () => {
  it("computes round2(lineTotal × rate / 100)", () => {
    expect(lineTaxAmount(D(1000), D(18)).toFixed(2)).toBe("180.00");
    expect(lineTaxAmount(D(99.99), D(18)).toFixed(2)).toBe("18.00"); // 17.9982 → 18.00
  });
});

describe("computeLineTaxes", () => {
  it("sums per-line tax for a mixed-rate cart", () => {
    const { tax, perLine } = computeLineTaxes(
      [
        { lineTotal: D(1000), productRate: null, categoryId: "electronics" }, // 18% → 180
        { lineTotal: D(500), productRate: null, categoryId: "books" }, //  0% → 0
        { lineTotal: D(200), productRate: D(5), categoryId: "electronics" }, //  5% → 10
      ],
      ctx()
    );
    expect(tax.toFixed(2)).toBe("190.00");
    expect(perLine.map((p) => p.amount.toFixed(2))).toEqual([
      "180.00",
      "0.00",
      "10.00",
    ]);
  });

  it("returns 0 tax for every line when disabled", () => {
    const { tax } = computeLineTaxes(
      [{ lineTotal: D(1000), productRate: D(18), categoryId: "electronics" }],
      ctx({ enabled: false })
    );
    expect(tax.toNumber()).toBe(0);
  });
});
