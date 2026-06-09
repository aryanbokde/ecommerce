"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";
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
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  itemCount: number;
}

interface Query {
  page: number;
  limit: number;
  search: string;
  status: string; // "all" | <status>
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

const inr = (v: number) =>
  `₹${v.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function OrderLookup() {
  // The topbar / dashboard search routes here with ?q=…
  const initialSearch = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState<Query>({
    page: 1,
    limit: 20,
    search: initialSearch,
    status: "all",
  });
  const [result, setResult] = useState<{
    key: string;
    orders: OrderRow[];
    page: number;
    totalPages: number;
  } | null>(null);

  const key = JSON.stringify(query);
  const isLoading = result?.key !== key;

  useEffect(() => {
    const ctrl = new AbortController();
    const p = new URLSearchParams();
    p.set("page", String(query.page));
    p.set("limit", String(query.limit));
    if (query.search) p.set("search", query.search);
    if (query.status !== "all") p.set("status", query.status);

    fetch(`/api/support/orders?${p.toString()}`, {
      signal: ctrl.signal,
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        const d = j.data ?? {};
        setResult({
          key,
          orders: d.orders ?? [],
          page: d.page ?? 1,
          totalPages: d.totalPages ?? 1,
        });
      })
      .catch(() => {
        if (!ctrl.signal.aborted)
          setResult({ key, orders: [], page: 1, totalPages: 1 });
      });
    return () => ctrl.abort();
  }, [query, key]);

  const columns: Column<OrderRow>[] = [
    {
      key: "orderNumber",
      header: "Order",
      render: (o) => (
        <Link
          href={`/support/orders/${o.id}`}
          className="font-medium tabular-nums hover:underline"
        >
          {o.orderNumber}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (o) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{o.customerName ?? "—"}</p>
          {o.customerEmail && (
            <p className="truncate text-xs text-muted-foreground">
              {o.customerEmail}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      key: "payment",
      header: "Payment",
      render: (o) => (
        <span className="text-xs capitalize text-muted-foreground">
          {o.paymentStatus.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      className: "text-right",
      render: (o) => <span className="tabular-nums">{inr(o.total)}</span>,
    },
    {
      key: "createdAt",
      header: "Date",
      render: (o) => (
        <span className="text-muted-foreground">{fmtDate(o.createdAt)}</span>
      ),
    },
  ];

  return (
    <DashboardShell
      title="Order Lookup"
      description="Find an order by number or customer email"
    >
      <DataTable
        columns={columns}
        data={result?.orders ?? []}
        isLoading={isLoading}
        pagination={{ page: query.page, totalPages: result?.totalPages ?? 1 }}
        onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
        searchPlaceholder="Search order # or customer email…"
        onSearch={(search) => setQuery((q) => ({ ...q, search, page: 1 }))}
        emptyMessage="No orders match your search."
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
          <Select
            value={query.status}
            onValueChange={(v) =>
              setQuery((q) => ({ ...q, status: v ?? "all", page: 1 }))
            }
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(query.limit)}
            onValueChange={(v) =>
              setQuery((q) => ({ ...q, limit: Number(v) || 20, page: 1 }))
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
            aria-label={`View ${o.orderNumber}`}
            render={<Link href={`/support/orders/${o.id}`} />}
            nativeButton={false}
          >
            <Eye className="size-4" />
          </Button>
        )}
      />
    </DashboardShell>
  );
}

export default function OrderLookupPage() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <OrderLookup />
    </Suspense>
  );
}
