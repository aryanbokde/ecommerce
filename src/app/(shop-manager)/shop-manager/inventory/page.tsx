"use client";

import { useEffect, useState } from "react";
import {
  MoreHorizontal,
  SlidersHorizontal,
  History,
  ImageIcon,
  PackagePlus,
} from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { StockAdjustDialog } from "@/components/manager/StockAdjustDialog";
import { StockHistoryDialog } from "@/components/manager/StockHistoryDialog";
import { BulkRestockDialog } from "@/components/manager/BulkRestockDialog";
import { MANAGER_BADGES_REFRESH } from "@/components/manager/ManagerSidebar";
import { cn } from "@/lib/utils";

interface InvProduct {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  lowStockAt: number;
  image: string | null;
  lastMovement: { type: string; quantity: number; createdAt: string } | null;
}

interface InvSummary {
  total: number;
  out: number;
  low: number;
  inStock: number;
  units: number;
  value: number;
}

interface ServerFilters {
  page: number;
  limit: number;
  search: string;
  stockStatus: string; // all | low | out | in
  tick: number;
}

const inr = (v: number) =>
  `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

const DAY = 86_400_000;
function ago(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  return d === 0 ? "today" : `${d}d ago`;
}

export default function InventoryPage() {
  const [server, setServer] = useState<ServerFilters>({
    page: 1,
    limit: 20,
    search: "",
    stockStatus: "all",
    tick: 0,
  });
  const [result, setResult] = useState<{
    key: string;
    products: InvProduct[];
    total: number;
    page: number;
    totalPages: number;
    summary: InvSummary | null;
  } | null>(null);

  const [adjustTarget, setAdjustTarget] = useState<InvProduct | null>(null);
  const [historyTarget, setHistoryTarget] = useState<InvProduct | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const key = JSON.stringify(server);
  const isLoading = result?.key !== key;

  useEffect(() => {
    const ctrl = new AbortController();
    const p = new URLSearchParams();
    p.set("page", String(server.page));
    p.set("limit", String(server.limit));
    if (server.search) p.set("search", server.search);
    if (server.stockStatus !== "all") p.set("stockStatus", server.stockStatus);

    fetch(`/api/manager/inventory?${p.toString()}`, {
      signal: ctrl.signal,
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        const d = j.data ?? {};
        setResult({
          key,
          products: d.products ?? [],
          total: d.total ?? 0,
          page: d.page ?? 1,
          totalPages: d.totalPages ?? 1,
          summary: d.summary ?? null,
        });
      })
      .catch(() => {
        if (!ctrl.signal.aborted)
          setResult({
            key,
            products: [],
            total: 0,
            page: 1,
            totalPages: 1,
            summary: null,
          });
      });
    return () => ctrl.abort();
  }, [server, key]);

  const bump = () => setServer((s) => ({ ...s, tick: s.tick + 1 }));
  // After a real stock change, refresh the list AND the sidebar low-stock badge
  // (restocking above the minimum drops it from the count).
  const onStockChanged = () => {
    window.dispatchEvent(new Event(MANAGER_BADGES_REFRESH));
    bump();
  };

  const columns: Column<InvProduct>[] = [
    {
      key: "image",
      header: "",
      className: "w-0",
      render: (p) =>
        p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-10 rounded-md object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <ImageIcon className="size-4" />
          </div>
        ),
    },
    {
      key: "name",
      header: "Product",
      render: (p) => <span className="font-medium">{p.name}</span>,
    },
    {
      key: "sku",
      header: "SKU",
      render: (p) => (
        <span className="text-muted-foreground tabular-nums">{p.sku ?? "—"}</span>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      render: (p) => {
        const tone =
          p.stock === 0
            ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
            : p.stock <= p.lowStockAt
              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
              : "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400";
        return (
          <span
            className={cn(
              "inline-flex min-w-8 justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
              tone
            )}
          >
            {p.stock}
          </span>
        );
      },
    },
    {
      key: "lowStockAt",
      header: "Threshold",
      className: "text-center",
      render: (p) => <span className="tabular-nums text-muted-foreground">{p.lowStockAt}</span>,
    },
    {
      key: "lastMovement",
      header: "Last movement",
      render: (p) =>
        p.lastMovement ? (
          <span className="text-xs text-muted-foreground">
            <span className="capitalize">{p.lastMovement.type}</span>{" "}
            <span
              className={cn(
                "font-medium tabular-nums",
                p.lastMovement.quantity >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {p.lastMovement.quantity >= 0 ? "+" : ""}
              {p.lastMovement.quantity}
            </span>{" "}
            · {ago(p.lastMovement.createdAt)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <DashboardShell
      title="Inventory"
      description="Adjust stock and review the movement ledger"
      action={
        <Button onClick={() => setBulkOpen(true)}>
          <PackagePlus className="size-4" />
          Bulk Restock
        </Button>
      }
    >
      {/* Inventory health summary */}
      {result?.summary && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Tile label="Total SKUs" value={result.summary.total} />
          <Tile label="In stock" value={result.summary.inStock} tone="green" />
          <Tile label="Low stock" value={result.summary.low} tone="amber" />
          <Tile label="Out of stock" value={result.summary.out} tone="red" />
          <Tile
            label="Stock value"
            value={inr(result.summary.value)}
            sub={`${result.summary.units.toLocaleString("en-IN")} units`}
          />
        </div>
      )}

      <DataTable
        columns={columns}
        data={result?.products ?? []}
        isLoading={isLoading}
        pagination={{ page: server.page, totalPages: result?.totalPages ?? 1 }}
        onPageChange={(page) => setServer((s) => ({ ...s, page }))}
        searchPlaceholder="Search name or SKU…"
        onSearch={(search) => setServer((s) => ({ ...s, search, page: 1 }))}
        emptyMessage="No products match these filters."
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
          <Select
            value={server.stockStatus}
            onValueChange={(v) =>
              setServer((s) => ({ ...s, stockStatus: v ?? "all", page: 1 }))
            }
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stock</SelectItem>
              <SelectItem value="low">Low stock</SelectItem>
              <SelectItem value="out">Out of stock</SelectItem>
              <SelectItem value="in">In stock</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={String(server.limit)}
            onValueChange={(v) =>
              setServer((s) => ({ ...s, limit: Number(v) || 20, page: 1 }))
            }
          >
            <SelectTrigger className="h-9 w-32" aria-label="Products per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        }
        rowActions={(p) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Actions" />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem onClick={() => setAdjustTarget(p)}>
                <SlidersHorizontal />
                Adjust stock
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setHistoryTarget(p)}>
                <History />
                View history
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {/* Dialogs (fresh mount per open for clean state) */}
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

      {historyTarget && (
        <StockHistoryDialog
          productId={historyTarget.id}
          productName={historyTarget.name}
          open
          onOpenChange={(o) => !o && setHistoryTarget(null)}
        />
      )}

      {bulkOpen && (
        <BulkRestockDialog open onOpenChange={setBulkOpen} onDone={onStockChanged} />
      )}
    </DashboardShell>
  );
}

function Tile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "default" | "green" | "amber" | "red";
}) {
  const toneCls =
    tone === "green"
      ? "text-green-600 dark:text-green-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "red"
          ? "text-rose-600 dark:text-rose-400"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", toneCls)}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
