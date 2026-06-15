import "server-only";

import { Prisma } from "@/generated/prisma";
import prisma from "@/server/db";
import { getStoreConfig } from "@/server/services/settings.service";
import { resolveTaxRate, type TaxContext } from "@/lib/tax";

// ── Tax context loader (DB) ───────────────────────────────────────────────────
// Loads the global on/off + default rate (settings, cached ~60s) and every
// category's rate/parent (for chain inheritance) once. Shared by checkout
// (order.service) and the cart preview so both resolve rates identically.

export async function loadTaxContext(): Promise<TaxContext> {
  const [cfg, categories] = await Promise.all([
    getStoreConfig(),
    prisma.category.findMany({
      select: { id: true, taxRate: true, parentId: true },
    }),
  ]);
  return {
    enabled: cfg.taxEnabled,
    defaultRate: new Prisma.Decimal(cfg.defaultTaxRate),
    categories: new Map(
      categories.map((c) => [c.id, { taxRate: c.taxRate, parentId: c.parentId }])
    ),
  };
}

/** Effective percent for a product given its override + category, as a string. */
export function effectiveRateString(
  productRate: Prisma.Decimal | null,
  categoryId: string | null,
  ctx: TaxContext
): string {
  return resolveTaxRate(productRate, categoryId, ctx).toFixed(2);
}
