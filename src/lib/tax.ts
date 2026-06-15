import { Prisma } from "@/generated/prisma";

// ── Tax resolution (pure, DB-free → unit-testable) ────────────────────────────
// Hybrid tax: a product can override; otherwise the rate is inherited from its
// category chain (closest non-null wins); otherwise the global default. A global
// switch turns all tax off. Rates are PERCENTS (e.g. 18 = 18%). 0 is a real rate
// (tax-free) and is distinct from null (inherit).

const ZERO = new Prisma.Decimal(0);

export interface TaxCategoryNode {
  taxRate: Prisma.Decimal | null;
  parentId: string | null;
}

export interface TaxContext {
  enabled: boolean;
  /** Fallback percent when neither product nor any ancestor category sets one. */
  defaultRate: Prisma.Decimal;
  /** id → { taxRate, parentId } for every category (load once). */
  categories: Map<string, TaxCategoryNode>;
}

export interface TaxLine {
  lineTotal: Prisma.Decimal;
  productRate: Prisma.Decimal | null;
  categoryId: string | null;
}

/** First non-null taxRate walking categoryId → parent → … (cycle-safe). */
function categoryChainRate(
  categoryId: string | null,
  categories: Map<string, TaxCategoryNode>
): Prisma.Decimal | null {
  let id = categoryId;
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    const node = categories.get(id);
    if (!node) break;
    if (node.taxRate !== null) return node.taxRate;
    id = node.parentId;
  }
  return null;
}

/** Effective tax percent for one line: off → 0; product override (0 honored);
 *  else category chain; else default. */
export function resolveTaxRate(
  productRate: Prisma.Decimal | null,
  categoryId: string | null,
  ctx: TaxContext
): Prisma.Decimal {
  if (!ctx.enabled) return ZERO;
  if (productRate !== null) return productRate;
  const fromCategory = categoryChainRate(categoryId, ctx.categories);
  return fromCategory ?? ctx.defaultRate;
}

/** Rupee tax for one line = round2(lineTotal × ratePercent / 100). */
export function lineTaxAmount(
  lineTotal: Prisma.Decimal,
  ratePercent: Prisma.Decimal
): Prisma.Decimal {
  return lineTotal.mul(ratePercent).div(100).toDecimalPlaces(2);
}

export interface ComputedLine {
  rate: Prisma.Decimal;
  amount: Prisma.Decimal;
}

/** Per-line tax for a cart; total tax = Σ line tax (invoice-style rounding). */
export function computeLineTaxes(
  lines: TaxLine[],
  ctx: TaxContext
): { tax: Prisma.Decimal; perLine: ComputedLine[] } {
  let tax = new Prisma.Decimal(0);
  const perLine: ComputedLine[] = [];
  for (const line of lines) {
    const rate = resolveTaxRate(line.productRate, line.categoryId, ctx);
    const amount = lineTaxAmount(line.lineTotal, rate);
    tax = tax.add(amount);
    perLine.push({ rate, amount });
  }
  return { tax, perLine };
}
