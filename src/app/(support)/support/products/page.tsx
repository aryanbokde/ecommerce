"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ImageIcon, ExternalLink } from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Read-only product lookup for support — check price, stock, and availability
// to help a shopper. Reuses the public GET /api/products (no mutations here).
interface ProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: string;
  stock: number;
  lowStockAt: number;
  isActive: boolean;
  images: string[] | null;
  category: { id: string; name: string } | null;
}

interface Query {
  page: number;
  limit: number;
  search: string;
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export default function ProductLookupPage() {
  const [query, setQuery] = useState<Query>({ page: 1, limit: 20, search: "" });
  const [result, setResult] = useState<{
    key: string;
    products: ProductRow[];
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
    // No isActive filter → support sees active AND inactive products.

    fetch(`/api/products?${p.toString()}`, {
      signal: ctrl.signal,
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        const d = j.data ?? {};
        setResult({
          key,
          products: d.products ?? [],
          page: d.page ?? 1,
          totalPages: d.totalPages ?? 1,
        });
      })
      .catch(() => {
        if (!ctrl.signal.aborted)
          setResult({ key, products: [], page: 1, totalPages: 1 });
      });
    return () => ctrl.abort();
  }, [query, key]);

  const columns: Column<ProductRow>[] = [
    {
      key: "image",
      header: "",
      className: "w-0",
      render: (p) => {
        const src = p.images?.[0];
        return src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-10 rounded-md object-cover" />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <ImageIcon className="size-4" />
          </div>
        );
      },
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
      key: "category",
      header: "Category",
      render: (p) =>
        p.category?.name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "price",
      header: "Price",
      className: "text-right",
      render: (p) => <span className="tabular-nums">{inr(p.price)}</span>,
    },
    {
      key: "stock",
      header: "Stock",
      render: (p) => {
        if (p.stock === 0)
          return <Badge variant="destructive">Out of stock</Badge>;
        if (p.stock <= p.lowStockAt)
          return (
            <Badge className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              Low · {p.stock}
            </Badge>
          );
        return <span className="tabular-nums">{p.stock}</span>;
      },
    },
    {
      key: "availability",
      header: "Availability",
      render: (p) =>
        p.isActive ? (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-400">
            Listed
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            Unlisted
          </span>
        ),
    },
  ];

  return (
    <DashboardShell
      title="Product Lookup"
      description="Check price, stock, and availability — read-only"
    >
      <DataTable
        columns={columns}
        data={result?.products ?? []}
        isLoading={isLoading}
        pagination={{ page: query.page, totalPages: result?.totalPages ?? 1 }}
        onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
        searchPlaceholder="Search by name or SKU…"
        onSearch={(search) => setQuery((q) => ({ ...q, search, page: 1 }))}
        emptyMessage="No products match your search."
        toolbar={
          <Select
            value={String(query.limit)}
            onValueChange={(v) =>
              setQuery((q) => ({ ...q, limit: Number(v) || 20, page: 1 }))
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
        }
        rowActions={(p) => (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`View ${p.name} in store`}
            title="View in store"
            render={
              <Link
                href={`/products/${p.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            nativeButton={false}
          >
            <ExternalLink className="size-4" />
          </Button>
        )}
      />
    </DashboardShell>
  );
}
