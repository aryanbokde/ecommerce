"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { notifyError, notifySuccess } from "@/lib/notify";

interface AdminProduct {
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

interface CategoryOption {
  id: string;
  name: string;
  depth: number;
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

const PUT_JSON = {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  credentials: "include" as const,
};

export default function ProductsPage() {
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
    products: AdminProduct[];
    page: number;
    totalPages: number;
  } | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const key = JSON.stringify({ ...query, refreshTick });
  const isLoading = result?.key !== key;

  // Load product list whenever the query (or a refresh) changes.
  useEffect(() => {
    const ctrl = new AbortController();
    const p = new URLSearchParams();
    p.set("page", String(query.page));
    p.set("limit", String(query.limit));
    if (query.search) p.set("search", query.search);
    if (query.categoryId) p.set("categoryId", query.categoryId);
    p.set("sortBy", query.sortBy);
    p.set("sortOrder", query.sortOrder);
    // No isActive filter → admins see active AND inactive products.
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

  // Load category options for the filter.
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

  async function toggleStatus(p: AdminProduct, next: boolean) {
    const res = await fetch(`/api/products/${p.id}`, {
      ...PUT_JSON,
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

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/products/${deleteTarget.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setDeleting(false);
    if (res.ok) {
      notifySuccess("Product archived", deleteTarget.name);
      setSelectedIds((ids) => ids.filter((id) => id !== deleteTarget.id));
      setDeleteTarget(null);
      bump();
    } else {
      const j = await res.json().catch(() => null);
      notifyError("Couldn't delete product", j?.error);
    }
  }

  async function bulkSetActive(ids: string[], active: boolean) {
    setBusy(true);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/products/${id}`, {
          ...PUT_JSON,
          body: JSON.stringify({ isActive: active }),
        })
      )
    );
    setBusy(false);
    notifySuccess(
      `${ids.length} ${ids.length === 1 ? "product" : "products"} ${
        active ? "activated" : "deactivated"
      }`
    );
    setSelectedIds([]);
    bump();
  }

  const columns: Column<AdminProduct>[] = [
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
            className="size-10 rounded-md object-cover"
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
          href={`/dashboard/products/${p.id}/edit`}
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
        <span className="text-muted-foreground tabular-nums">
          {p.sku ?? "—"}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (p) => p.category?.name ?? <span className="text-muted-foreground">—</span>,
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
    <DashboardShell
      title="Products"
      description="Manage your catalog"
      action={
        <Button
          render={<Link href="/dashboard/products/new" />}
          nativeButton={false}
        >
          <Plus className="size-4" />
          Add Product
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={result?.products ?? []}
        isLoading={isLoading}
        pagination={{ page: query.page, totalPages: result?.totalPages ?? 1 }}
        onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
        onSort={(sortBy, sortOrder) => {
          setQuery((q) => ({ ...q, sortBy, sortOrder, page: 1 }));
          setSelectedIds([]);
        }}
        searchPlaceholder="Search products…"
        onSearch={(search) => {
          setQuery((q) => ({ ...q, search, page: 1 }));
          setSelectedIds([]);
        }}
        emptyMessage="No products found."
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkBar={(ids) => (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => bulkSetActive(ids, true)}
            >
              Activate
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => bulkSetActive(ids, false)}
            >
              Deactivate
            </Button>
          </>
        )}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
          <Select
            value={query.categoryId ?? "all"}
            // items maps value → label so the trigger shows the category NAME
            // (not the raw id) once one is selected.
            items={[
              { value: "all", label: "All categories" },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            onValueChange={(v) => {
              setQuery((q) => ({
                ...q,
                categoryId: v === "all" || v == null ? null : v,
                page: 1,
              }));
              setSelectedIds([]);
            }}
          >
            <SelectTrigger className="h-9 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {"  ".repeat(c.depth)}
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(query.limit)}
            onValueChange={(v) => {
              setQuery((q) => ({ ...q, limit: Number(v) || 20, page: 1 }));
              setSelectedIds([]);
            }}
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
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit"
              render={<Link href={`/dashboard/products/${p.id}/edit`} />}
              nativeButton={false}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete"
              onClick={() => setDeleteTarget(p)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        )}
      />

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.name}” will be archived — deactivated and hidden
              from the store. Existing order history is preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardShell>
  );
}
