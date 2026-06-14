"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Movement {
  id: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reason: string | null;
  reference: string | null;
  createdAt: string;
  user: { id: string; name: string | null } | null;
}

interface StockHistoryDialogProps {
  productId: string;
  productName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_STYLE: Record<string, string> = {
  restock: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  return: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  sale: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  damage: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  correction: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function StockHistoryDialog({
  productId,
  productName,
  open,
  onOpenChange,
}: StockHistoryDialogProps) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{
    key: string;
    items: Movement[];
    totalPages: number;
  } | null>(null);

  const key = `${productId}:${page}`;
  const loading = result?.key !== key;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/manager/inventory/${productId}/history?page=${page}&limit=10`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        if (!cancelled)
          setResult({
            key,
            items: j.data?.items ?? [],
            totalPages: j.data?.totalPages ?? 1,
          });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, items: [], totalPages: 1 });
      });
    return () => {
      cancelled = true;
    };
  }, [productId, page, key]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Stock history{productName ? ` · ${productName}` : ""}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : result.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No stock movements recorded yet.
          </p>
        ) : (
          <ul className="-mx-1 max-h-[60vh] divide-y divide-border overflow-y-auto">
            {result.items.map((m) => {
              const up = m.quantity >= 0;
              return (
                <li key={m.id} className="flex items-start gap-3 px-1 py-3">
                  <span
                    className={cn(
                      "mt-0.5 inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                      TYPE_STYLE[m.type] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {m.type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm">
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          up ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {up ? "+" : ""}
                        {m.quantity}
                      </span>
                      <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                        {m.stockBefore}
                        <ArrowRight className="size-3" />
                        {m.stockAfter}
                      </span>
                    </p>
                    {m.reason && (
                      <p className="truncate text-xs text-muted-foreground">
                        {m.reason}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {m.reference ? `${m.reference} · ` : ""}
                      {m.user?.name ?? "System"} · {fmtDateTime(m.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {result && result.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {result.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= result.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
