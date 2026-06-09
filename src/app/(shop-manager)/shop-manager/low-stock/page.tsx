"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  PackageX,
  PackageCheck,
  PackagePlus,
  ImageIcon,
} from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { StockAdjustDialog } from "@/components/manager/StockAdjustDialog";
import { BulkRestockDialog } from "@/components/manager/BulkRestockDialog";
import { MANAGER_BADGES_REFRESH } from "@/components/manager/ManagerSidebar";

interface LowStockRow {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  lowStockAt: number;
  image: string | null;
  soldLast30d: number;
}

export default function LowStockPage() {
  const [result, setResult] = useState<{
    key: string;
    outOfStock: LowStockRow[];
    lowStock: LowStockRow[];
  } | null>(null);
  const [tick, setTick] = useState(0);
  const [adjustTarget, setAdjustTarget] = useState<LowStockRow | null>(null);
  const [bulkSeed, setBulkSeed] = useState<
    { productId: string; name: string; quantity: number }[] | null
  >(null);

  const key = String(tick);
  const isLoading = result?.key !== key;

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/manager/low-stock", {
      signal: ctrl.signal,
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        const d = j.data ?? {};
        setResult({
          key,
          outOfStock: d.outOfStock ?? [],
          lowStock: d.lowStock ?? [],
        });
      })
      .catch(() => {
        if (!ctrl.signal.aborted)
          setResult({ key, outOfStock: [], lowStock: [] });
      });
    return () => ctrl.abort();
  }, [tick, key]);

  const bump = () => setTick((t) => t + 1);
  // Restocking changes the real low-stock count → refresh list + sidebar badge.
  const onStockChanged = () => {
    window.dispatchEvent(new Event(MANAGER_BADGES_REFRESH));
    bump();
  };

  const outOfStock = result?.outOfStock ?? [];
  const lowStock = result?.lowStock ?? [];
  const allRows = [...outOfStock, ...lowStock];

  // "Restock All" pre-fills the bulk dialog so it tops each item back up to a
  // sensible level (threshold + a small buffer), then lets the manager tweak.
  function restockAll() {
    setBulkSeed(
      allRows.map((p) => ({
        productId: p.id,
        name: p.name,
        quantity: Math.max(p.lowStockAt * 2 - p.stock, p.lowStockAt, 1),
      }))
    );
  }

  return (
    <DashboardShell
      title="Low Stock Alerts"
      description="Products at or below their threshold — restock before they sell out"
      action={
        <Button onClick={restockAll} disabled={isLoading || allRows.length === 0}>
          <PackagePlus className="size-4" />
          Restock All
        </Button>
      }
    >
      <div className="space-y-8">
        <Section
          title="Out of Stock"
          icon={PackageX}
          tone="red"
          count={outOfStock.length}
          isLoading={isLoading}
          rows={outOfStock}
          emptyMessage="Nothing is out of stock."
          onRestock={setAdjustTarget}
        />
        <Section
          title="Low Stock"
          icon={AlertTriangle}
          tone="amber"
          count={lowStock.length}
          isLoading={isLoading}
          rows={lowStock}
          emptyMessage="No products are running low."
          onRestock={setAdjustTarget}
        />
      </div>

      {adjustTarget && (
        <StockAdjustDialog
          product={{
            id: adjustTarget.id,
            name: adjustTarget.name,
            stock: adjustTarget.stock,
          }}
          open
          onOpenChange={(o) => !o && setAdjustTarget(null)}
          onDone={onStockChanged}
        />
      )}

      {bulkSeed && (
        <BulkRestockDialog
          open
          initialItems={bulkSeed}
          onOpenChange={(o) => !o && setBulkSeed(null)}
          onDone={onStockChanged}
        />
      )}
    </DashboardShell>
  );
}

const TONES = {
  red: {
    badge: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    head: "text-red-600",
    stock: "text-red-600",
  },
  amber: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    head: "text-amber-600",
    stock: "text-amber-600",
  },
} as const;

function Section({
  title,
  icon: Icon,
  tone,
  count,
  isLoading,
  rows,
  emptyMessage,
  onRestock,
}: {
  title: string;
  icon: typeof AlertTriangle;
  tone: keyof typeof TONES;
  count: number;
  isLoading: boolean;
  rows: LowStockRow[];
  emptyMessage: string;
  onRestock: (row: LowStockRow) => void;
}) {
  const t = TONES[tone];
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={cn("size-4", t.head)} />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
            t.badge
          )}
        >
          {isLoading ? "·" : count}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
          <PackageCheck className="size-4 text-green-600" />
          {emptyMessage}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-4 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {p.name}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {p.sku ?? "—"}
                </p>
              </div>
              <div className="hidden w-24 text-right sm:block">
                <p className={cn("text-sm font-semibold tabular-nums", t.stock)}>
                  {p.stock}
                </p>
                <p className="text-xs text-muted-foreground">
                  threshold {p.lowStockAt}
                </p>
              </div>
              <div className="hidden w-28 text-right md:block">
                <p className="text-sm font-medium tabular-nums text-foreground">
                  {p.soldLast30d}
                </p>
                <p className="text-xs text-muted-foreground">sold · 30d</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => onRestock(p)}
              >
                <PackagePlus className="size-4" />
                Restock
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
