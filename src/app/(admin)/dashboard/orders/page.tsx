"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, Eye, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { cn } from "@/lib/utils";
import { exportToCsv } from "@/lib/export-csv";
import { notifyError } from "@/lib/notify";

interface AdminOrder {
  id: string;
  orderNumber: string;
  total: string;
  status: string;
  paymentStatus: string;
  seenByAdmin: boolean;
  createdAt: string;
  items: { id: string }[];
  user: { id: string; name: string | null; email: string } | null;
  returnRequest: { status: string; seenByAdmin: boolean } | null;
}

// A row needs attention if the order is unseen, or it has a new (unseen)
// pending return request.
const hasNewReturn = (o: AdminOrder) =>
  o.returnRequest?.status === "requested" && !o.returnRequest.seenByAdmin;

interface ServerFilters {
  page: number;
  limit: number; // orders per page
  status: string; // "all" | order status
  payment: string; // "all" | payment status
  from: string; // yyyy-mm-dd
  to: string; // yyyy-mm-dd
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

const STATUS_TABS = [
  "all",
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

const PAYMENT_OPTIONS = [
  { value: "all", label: "All payments" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
  { value: "failed", label: "Failed" },
  { value: "refund_pending", label: "Refund pending" },
  { value: "refunded", label: "Refunded" },
];

const PAYMENT_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  unpaid: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  refund_pending:
    "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  refunded: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const toCsvRow = (o: AdminOrder) => ({
  "Order #": o.orderNumber,
  Customer: o.user?.name ?? "",
  Email: o.user?.email ?? "",
  Items: o.items.length,
  Total: Number(o.total).toFixed(2),
  Payment: o.paymentStatus,
  Status: o.status,
  Date: new Date(o.createdAt).toISOString(),
});

function initials(value: string): string {
  return (
    value
      .trim()
      .split(/[\s@.]+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersPageInner />
    </Suspense>
  );
}

function OrdersPageInner() {
  const searchParams = useSearchParams();
  // Seed filters from the URL once, so the sidebar's "pending" badge deep-link
  // (/dashboard/orders?status=pending) lands on the right tab.
  const [server, setServer] = useState<ServerFilters>(() => {
    const s = searchParams.get("status");
    const pay = searchParams.get("paymentStatus");
    return {
      page: 1,
      limit: 20,
      status:
        s && (STATUS_TABS as readonly string[]).includes(s) ? s : "all",
      payment: pay ?? "all",
      from: "",
      to: "",
    };
  });
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<{
    key: string;
    orders: AdminOrder[];
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);

  const key = JSON.stringify(server);
  const isLoading = result?.key !== key;

  useEffect(() => {
    const ctrl = new AbortController();
    const p = new URLSearchParams();
    p.set("page", String(server.page));
    p.set("limit", String(server.limit));
    if (server.status !== "all") p.set("status", server.status);
    if (server.payment !== "all") p.set("paymentStatus", server.payment);
    if (server.from) p.set("from", server.from);
    if (server.to) p.set("to", `${server.to}T23:59:59.999`);

    fetch(`/api/orders?${p.toString()}`, {
      signal: ctrl.signal,
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        const d = j.data ?? {};
        setResult({
          key,
          orders: d.orders ?? [],
          total: d.total ?? 0,
          page: d.page ?? 1,
          totalPages: d.totalPages ?? 1,
        });
      })
      .catch(() => {
        if (!ctrl.signal.aborted)
          setResult({ key, orders: [], total: 0, page: 1, totalPages: 1 });
      });
    return () => ctrl.abort();
  }, [server, key]);

  // Client-side search over the loaded page (the orders API has no text search).
  const q = search.trim().toLowerCase();
  const orders = (result?.orders ?? []).filter(
    (o) =>
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      (o.user?.email?.toLowerCase().includes(q) ?? false)
  );

  const [exporting, setExporting] = useState(false);

  // Export EVERY order matching the active filters (status / payment / date
  // range) — not just the current page. Paginates the API (max 100/page) and
  // also applies the client-side search box if one is set.
  async function handleExport() {
    setExporting(true);
    try {
      const base = new URLSearchParams();
      base.set("limit", "100");
      if (server.status !== "all") base.set("status", server.status);
      if (server.payment !== "all") base.set("paymentStatus", server.payment);
      if (server.from) base.set("from", server.from);
      if (server.to) base.set("to", `${server.to}T23:59:59.999`);

      const all: AdminOrder[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        base.set("page", String(page));
        const res = await fetch(`/api/orders?${base.toString()}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("failed");
        const d = (await res.json())?.data ?? {};
        all.push(...((d.orders ?? []) as AdminOrder[]));
        totalPages = d.totalPages ?? 1;
        page++;
      } while (page <= totalPages && page <= 100); // hard cap: 10k orders

      const matched = q
        ? all.filter(
            (o) =>
              o.orderNumber.toLowerCase().includes(q) ||
              (o.user?.email?.toLowerCase().includes(q) ?? false)
          )
        : all;

      if (matched.length === 0) {
        notifyError("Nothing to export", "No orders match these filters.");
        return;
      }

      const rows = matched.map(toCsvRow);
      const range =
        server.from || server.to
          ? `_${server.from || "start"}_to_${server.to || "now"}`
          : "";
      exportToCsv(
        `orders${range}-${new Date().toISOString().slice(0, 10)}`,
        rows
      );
    } catch {
      notifyError("Export failed", "Could not fetch orders. Try again.");
    } finally {
      setExporting(false);
    }
  }

  // Export just the selected rows (those loaded on the current page) to CSV.
  function exportSelected(ids: string[]) {
    const set = new Set(ids);
    const matched = (result?.orders ?? []).filter((o) => set.has(o.id));
    if (matched.length === 0) {
      notifyError("Nothing to export", "Select orders on this page first.");
      return;
    }
    exportToCsv(
      `orders-selected-${new Date().toISOString().slice(0, 10)}`,
      matched.map(toCsvRow)
    );
    setSelectedIds([]);
  }

  const columns: Column<AdminOrder>[] = [
    {
      key: "avatar",
      header: "",
      className: "w-0",
      render: (o) => (
        <Avatar size="sm" className="ring-1 ring-border">
          <AvatarFallback>
            {initials(o.user?.name ?? o.user?.email ?? "?")}
          </AvatarFallback>
        </Avatar>
      ),
    },
    {
      key: "orderNumber",
      header: "Order #",
      render: (o) => (
        <div className="flex items-center gap-2">
          {!o.seenByAdmin && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              New
            </span>
          )}
          {hasNewReturn(o) && (
            <span className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
              Return
            </span>
          )}
          <Link
            href={`/dashboard/orders/${o.id}`}
            className="font-medium hover:underline"
          >
            {o.orderNumber}
          </Link>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (o) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {o.user?.name ?? "—"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {o.user?.email}
          </p>
        </div>
      ),
    },
    {
      key: "items",
      header: "Items",
      className: "text-center",
      render: (o) => <span className="tabular-nums">{o.items.length}</span>,
    },
    {
      key: "total",
      header: "Total",
      className: "text-right",
      render: (o) => <span className="tabular-nums">{inr(o.total)}</span>,
    },
    {
      key: "payment",
      header: "Payment",
      render: (o) => (
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
            PAYMENT_STYLES[o.paymentStatus] ?? "bg-muted text-muted-foreground"
          )}
        >
          {o.paymentStatus.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      key: "date",
      header: "Date",
      className: "text-right",
      render: (o) => (
        <span className="text-muted-foreground">{fmtDate(o.createdAt)}</span>
      ),
    },
  ];

  return (
    <DashboardShell
      title="Orders"
      description="View and fulfil customer orders"
      action={
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Export CSV
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Status filter tabs + result count */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={server.status}
            onValueChange={(v) =>
              setServer((s) => ({ ...s, status: v ?? "all", page: 1 }))
            }
          >
            <TabsList className="h-auto flex-wrap">
              {STATUS_TABS.map((s) => (
                <TabsTrigger key={s} value={s} className="capitalize">
                  {s === "all" ? "All" : s}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {result && !isLoading && (
            <span className="text-sm text-muted-foreground">
              {result.total} {result.total === 1 ? "order" : "orders"}
            </span>
          )}
        </div>

        <DataTable
          columns={columns}
          data={orders}
          rowClassName={(o) =>
            !o.seenByAdmin || hasNewReturn(o)
              ? "bg-primary/[0.07] font-medium [&>td:first-child]:border-l-4 [&>td:first-child]:border-l-primary"
              : undefined
          }
          isLoading={isLoading}
          pagination={{ page: server.page, totalPages: result?.totalPages ?? 1 }}
          onPageChange={(page) => setServer((s) => ({ ...s, page }))}
          searchPlaceholder="Search order # or email…"
          onSearch={setSearch}
          emptyMessage="No orders match these filters."
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkBar={(ids) => (
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportSelected(ids)}
            >
              <Download className="size-4" />
              Export selected ({ids.length})
            </Button>
          )}
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={server.payment}
                onValueChange={(v) =>
                  setServer((s) => ({ ...s, payment: v ?? "all", page: 1 }))
                }
              >
                <SelectTrigger className="h-9 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <input
                type="date"
                value={server.from}
                max={server.to || undefined}
                aria-label="From date"
                onChange={(e) =>
                  setServer((s) => ({ ...s, from: e.target.value, page: 1 }))
                }
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <span className="text-muted-foreground">–</span>
              <input
                type="date"
                value={server.to}
                min={server.from || undefined}
                aria-label="To date"
                onChange={(e) =>
                  setServer((s) => ({ ...s, to: e.target.value, page: 1 }))
                }
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />

              {/* Orders per page */}
              <Select
                value={String(server.limit)}
                onValueChange={(v) =>
                  setServer((s) => ({
                    ...s,
                    limit: Number(v) || 20,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger className="h-9 w-32" aria-label="Orders per page">
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
          rowActions={(o) => (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="View order"
              render={<Link href={`/dashboard/orders/${o.id}`} />}
              nativeButton={false}
            >
              <Eye className="size-4" />
            </Button>
          )}
        />
      </div>
    </DashboardShell>
  );
}
