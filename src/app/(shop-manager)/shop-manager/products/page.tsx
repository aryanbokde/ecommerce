"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, ImageIcon } from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notifyError, notifySuccess } from "@/lib/notify";

// Manager-scoped catalog: edit + toggle active only. No delete (admin-only),
// no create — managers maintain the existing catalog, they don't grow it.
interface ManagerProduct {
  id: string;
  name: string;
  sku: string | null;
  price: string;
  stock: number;
  lowStockAt: number;
  isActive: boolean;
  images: string[] | null;
  category: { id: string; name: string } | null;
}

interface CategoryOption {
  id: string;
  name: string;
  depth: number;
}

interface CatalogSummary {
  total: number;
  active: number;
  inactive: number;
  low: number;
  out: number;
}

interface CategoryNode {
  id: string;
  name: string;
  children?: CategoryNode[];
}

function flattenCategories(nodes: CategoryNode[], depth = 0): CategoryOption[] {
  return nodes.flatMap((n) => [
    { id: n.id, name: n.name, depth },
    ...flattenCategories(n.children ?? [], depth + 1),
  ]);
}

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

interface Query {
  page: number;
  limit: number;
  search: string;
  categoryId: string | null;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

export default function ManagerProductsPage() {
  const [query, setQuery] = useState<Query>({
    page: 1,
    limit: 20,
    search: "",
    categoryId: null,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [refreshTick, setRefreshTick] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    products: ManagerProduct[];
    page: number;
    totalPages: number;
  } | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [summary, setSummary] = useState<CatalogSummary | null>(null);

  const key = JSON.stringify({ ...query, refreshTick });
  const isLoading = result?.key !== key;

  useEffect(() => {
    const ctrl = new AbortController();
    const p = new URLSearchParams();
    p.set("page", String(query.page));
    p.set("limit", String(query.limit));
    if (query.search) p.set("search", query.search);
    if (query.categoryId) p.set("categoryId", query.categoryId);
    p.set("sortBy", query.sortBy);
    p.set("sortOrder", query.sortOrder);
    // No isActive filter → managers see active AND inactive products.
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
  }, [query, refreshTick, key]);

  // Catalog rollup for the header tiles — refetch after a toggle changes the
  // active/inactive split.
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/manager/catalog-summary", {
      signal: ctrl.signal,
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => setSummary(j.data ?? null))
      .catch(() => {});
    return () => ctrl.abort();
  }, [refreshTick]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        if (!cancelled) setCategories(flattenCategories(j.data ?? []));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const bump = () => setRefreshTick((t) => t + 1);

  async function toggleStatus(p: ManagerProduct, next: boolean) {
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: next }),
    });
    if (res.ok) {
      notifySuccess(next ? "Product activated" : "Product deactivated", p.name);
      bump();
    } else {
      const j = await res.json().catch(() => null);
      notifyError("Couldn't update status", j?.error);
    }
  }

  const columns: Column<ManagerProduct>[] = [
    {
      key: "image",
      header: "",
      className: "w-0",
      render: (p) => {
        const src = p.images?.[0];
        return src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={p.name}
            loading="lazy"
            decoding="async"
            className="size-10 rounded-md object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <ImageIcon className="size-4" />
          </div>
        );
      },
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (p) => (
        <Link
          href={`/shop-manager/products/${p.id}/edit`}
          className="font-medium hover:underline"
        >
          {p.name}
        </Link>
      ),
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
      sortable: true,
      className: "text-right",
      render: (p) => <span className="tabular-nums">{inr(p.price)}</span>,
    },
    {
      key: "stock",
      header: "Stock",
      sortable: true,
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
      key: "status",
      header: "Active",
      render: (p) => (
        <Switch
          checked={p.isActive}
          onCheckedChange={(v) => toggleStatus(p, v)}
          aria-label={`Toggle ${p.name} active`}
        />
      ),
    },
  ];

  return (
    <DashboardShell title="Products" description="Edit catalog details and availability">
      {/* Catalog summary */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Tile label="Total products" value={summary.total} />
          <Tile label="Active" value={summary.active} tone="green" />
          <Tile label="Inactive" value={summary.inactive} />
          <Tile label="Low stock" value={summary.low} tone="amber" />
          <Tile label="Out of stock" value={summary.out} tone="red" />
        </div>
      )}

      <DataTable
        columns={columns}
        data={result?.products ?? []}
        isLoading={isLoading}
        pagination={{ page: query.page, totalPages: result?.totalPages ?? 1 }}
        onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
        onSort={(sortBy, sortOrder) =>
          setQuery((q) => ({ ...q, sortBy, sortOrder, page: 1 }))
        }
        searchPlaceholder="Search products…"
        onSearch={(search) => setQuery((q) => ({ ...q, search, page: 1 }))}
        emptyMessage="No products found."
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
          <Select
            value={query.categoryId ?? "all"}
            // items → trigger shows the category name (not the raw id).
            items={[
              { value: "all", label: "All categories" },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            onValueChange={(v) =>
              setQuery((q) => ({
                ...q,
                categoryId: v === "all" || v == null ? null : v,
                page: 1,
              }))
            }
          >
            <SelectTrigger className="h-9 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {"  ".repeat(c.depth)}
                  {c.name}
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
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit"
            render={<Link href={`/shop-manager/products/${p.id}/edit`} />}
            nativeButton={false}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      />
    </DashboardShell>
  );
}

function Tile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
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
    </div>
  );
}
