"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import type { SupportRecentOrder } from "@/server/services/support-stats.service";

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

// Client island so the server dashboard can reuse the (client) DataTable —
// columns carry render functions, which can't cross the RSC boundary.
export function RecentOrdersTable({ orders }: { orders: SupportRecentOrder[] }) {
  const columns: Column<SupportRecentOrder>[] = [
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
      key: "total",
      header: "Total",
      className: "text-right",
      render: (o) => <span className="tabular-nums">{inr(o.total)}</span>,
    },
    {
      key: "createdAt",
      header: "Date",
      render: (o) => (
        <span className="text-sm text-muted-foreground">
          {fmtDate(o.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={orders}
      emptyMessage="No recent orders."
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
  );
}
