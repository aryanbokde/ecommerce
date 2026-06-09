"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface ProductHit {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
}

interface RestockRow {
  productId: string;
  name: string;
  quantity: number;
}

interface BulkRestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  /** Pre-seed the row list (e.g. "Restock All" from Low Stock). Read once on
   *  mount — parents key this dialog by `open`, so a fresh mount re-seeds. */
  initialItems?: RestockRow[];
}

export function BulkRestockDialog({
  open,
  onOpenChange,
  onDone,
  initialItems,
}: BulkRestockDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductHit[]>([]);
  const [items, setItems] = useState<RestockRow[]>(initialItems ?? []);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Debounced product search (only when there's a query — no setState otherwise).
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`/api/products?search=${encodeURIComponent(q)}&limit=8`, {
        credentials: "include",
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
        .then((j) => {
          if (!cancelled) setResults(j.data?.products ?? []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  function addProduct(p: ProductHit) {
    if (!items.some((it) => it.productId === p.id)) {
      setItems((prev) => [...prev, { productId: p.id, name: p.name, quantity: 1 }]);
    }
    setQuery("");
    setResults([]);
  }

  function setQty(productId: string, quantity: number) {
    setItems((prev) =>
      prev.map((it) =>
        it.productId === productId
          ? { ...it, quantity: Math.max(1, Math.trunc(quantity) || 1) }
          : it
      )
    );
  }

  function remove(productId: string) {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  }

  async function submit() {
    if (items.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/manager/inventory/bulk-restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
          })),
          reference: reference.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Bulk restock failed", json?.error);
        return;
      }
      notifySuccess(
        "Restock applied",
        `${items.length} product${items.length === 1 ? "" : "s"} updated`
      );
      onDone();
      onOpenChange(false);
    } catch {
      notifyError("Something went wrong", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk restock</DialogTitle>
          <DialogDescription>
            Add products and quantities, then apply them in one transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Reference / PO */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Reference (PO number)
            </label>
            <Input
              value={reference}
              placeholder="e.g. PO-2026-0142"
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {/* Product search */}
          <div className="relative space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Add product
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                placeholder="Search by name or SKU…"
                className="pl-8"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {query.trim() !== "" && results.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => addProduct(p)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="min-w-0 truncate">
                        {p.name}
                        {p.sku && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {p.sku}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {p.stock} on hand
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Selected rows */}
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              No products added yet.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {items.map((it) => (
                <li
                  key={it.productId}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {it.name}
                  </span>
                  <span className="text-xs text-muted-foreground">+</span>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={it.quantity}
                    onChange={(e) => setQty(it.productId, Number(e.target.value))}
                    className="h-8 w-20 text-center"
                    aria-label={`Quantity for ${it.name}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${it.name}`}
                    onClick={() => remove(it.productId)}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={submit} disabled={items.length === 0 || submitting}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Restock {items.length > 0 ? `${items.length} product${items.length === 1 ? "" : "s"}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
