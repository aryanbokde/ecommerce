"use client";

import { useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import { notifyError, notifySuccess } from "@/lib/notify";

export interface AdjustProduct {
  id: string;
  name: string;
  stock: number;
}

interface StockAdjustDialogProps {
  product: AdjustProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

// Manual adjustments only (sales come from orders, not here).
const TYPES = [
  { value: "restock", label: "Restock (+)" },
  { value: "return", label: "Return (+)" },
  { value: "damage", label: "Damage (−)" },
  { value: "correction", label: "Correction (±)" },
] as const;

type AdjustType = (typeof TYPES)[number]["value"];

export function StockAdjustDialog({
  product,
  open,
  onOpenChange,
  onDone,
}: StockAdjustDialogProps) {
  const [type, setType] = useState<AdjustType>("restock");
  const [qty, setQty] = useState(1);
  const [dir, setDir] = useState<"increase" | "decrease">("increase");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reasonRequired = type === "damage" || type === "correction";

  // Signed delta applied to current stock for the live preview.
  const delta =
    type === "restock" || type === "return"
      ? qty
      : type === "damage"
        ? -qty
        : dir === "increase"
          ? qty
          : -qty; // correction
  const newStock = product.stock + delta;

  const canSubmit =
    qty > 0 &&
    newStock >= 0 &&
    (!reasonRequired || reason.trim() !== "") &&
    !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    // For corrections the API takes a signed quantity; others are positive
    // and the type supplies the sign server-side.
    const quantity = type === "correction" ? delta : qty;
    try {
      const res = await fetch("/api/manager/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId: product.id,
          type,
          quantity,
          reason: reason.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't adjust stock", json?.error);
        return;
      }
      notifySuccess("Stock adjusted", `${product.name}: ${newStock} on hand`);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {product.name} · {product.stock} on hand
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Type</label>
            <Select value={type} onValueChange={(v) => setType((v as AdjustType) ?? "restock")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Direction (correction only) */}
          {type === "correction" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Direction
              </label>
              <div className="flex rounded-lg border p-0.5">
                {(["increase", "decrease"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDir(d)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1 text-sm font-medium capitalize transition-colors",
                      dir === d
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity stepper */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Quantity
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Decrease"
                disabled={qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <Input
                type="number"
                min="1"
                step="1"
                value={qty}
                onChange={(e) =>
                  setQty(Math.max(1, Math.trunc(Number(e.target.value) || 1)))
                }
                className="w-20 text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Increase"
                onClick={() => setQty((q) => q + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Reason{reasonRequired && <span className="text-destructive"> *</span>}
            </label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                reasonRequired ? "Required for damage / correction" : "Optional"
              }
            />
          </div>

          {/* Live preview */}
          <div
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              newStock < 0
                ? "bg-destructive/10 text-destructive"
                : "bg-muted/60 text-foreground"
            )}
          >
            New stock will be:{" "}
            <span className="font-semibold tabular-nums">
              {Math.max(newStock, 0)}
            </span>
            {newStock < 0 && " — can't go below zero"}
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={submit} disabled={!canSubmit}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Apply adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
