// Group an order's line-tax snapshots into a per-rate GST breakup. Each
// OrderItem stores the resolved `taxRate` + `taxAmount` applied at order time,
// so a mixed-rate order can show "18%: ₹X · 5%: ₹Y" without recomputing.
//
// Orders placed BEFORE the per-line tax module have taxAmount = 0 on every item
// (column default), so this returns [] for them and the UI falls back to the
// stored total only.

// Accepts Prisma.Decimal (server) or a serialized string/number (client) — all
// coerce cleanly via Number().
type Numeric = string | number | { toString(): string };

interface TaxItem {
  taxRate: Numeric;
  taxAmount: Numeric;
}

export interface TaxBreakupRow {
  rate: number;
  amount: number;
}

export function groupTaxByRate(items: TaxItem[]): TaxBreakupRow[] {
  const byRate = new Map<number, number>();
  for (const it of items) {
    const amount = Number(it.taxAmount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const rate = Number(it.taxRate);
    byRate.set(rate, (byRate.get(rate) ?? 0) + amount);
  }
  return [...byRate.entries()]
    .map(([rate, amount]) => ({ rate, amount }))
    .sort((a, b) => b.rate - a.rate);
}
