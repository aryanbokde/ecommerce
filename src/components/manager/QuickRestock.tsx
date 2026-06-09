"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/lib/notify";

interface QuickRestockProps {
  productId: string;
  name: string;
  currentStock: number;
}

// Compact inline restock: set the new on-hand quantity and PUT it.
// Shop managers are permitted to update products (PUT /api/products/[id]).
export function QuickRestock({ productId, name, currentStock }: QuickRestockProps) {
  const router = useRouter();
  const [value, setValue] = useState(String(currentStock));
  const [saving, setSaving] = useState(false);

  const parsed = Number(value);
  const valid = Number.isInteger(parsed) && parsed >= 0;
  const dirty = parsed !== currentStock;

  async function save() {
    if (!valid || !dirty || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stock: parsed }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't update stock", json?.error);
        return;
      }
      notifySuccess("Stock updated", `${name}: ${parsed} on hand`);
      router.refresh();
    } catch {
      notifyError("Something went wrong", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min="0"
        step="1"
        value={value}
        aria-label={`Set stock for ${name}`}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-16 text-center"
      />
      <Button
        size="icon-sm"
        variant="outline"
        aria-label="Save stock"
        disabled={!valid || !dirty || saving}
        onClick={save}
      >
        {saving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Add 10 to stock"
        disabled={saving}
        onClick={() => setValue(String(parsed >= 0 && valid ? parsed + 10 : currentStock + 10))}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
