"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SORT_OPTIONS } from "@/components/shared/ProductSort";
import type { Category } from "@/types";

export interface FilterState {
  search?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface ProductFiltersProps {
  categories: Category[];
  currentFilters: FilterState;
}

export function ProductFilters({
  categories,
  currentFilters,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [min, setMin] = useState(currentFilters.minPrice ?? "");
  const [max, setMax] = useState(currentFilters.maxPrice ?? "");

  // Push a set of param updates; null/"" clears a key. Filter changes reset page.
  function setParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const currentSort = `${currentFilters.sortBy ?? "createdAt"}:${
    currentFilters.sortOrder ?? "desc"
  }`;
  const hasFilters = Boolean(
    currentFilters.categoryId ||
      currentFilters.minPrice ||
      currentFilters.maxPrice ||
      currentFilters.search
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Categories (single-select via checkboxes — the API filters one) */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">Categories</h3>
        <div className="mt-3 flex flex-col gap-2.5">
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground">No categories</p>
          ) : (
            categories.map((c) => {
              const checked = currentFilters.categoryId === c.id;
              return (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      setParams({ categoryId: value ? c.id : null })
                    }
                  />
                  <span className="flex-1">{c.name}</span>
                  {c.productCount != null && (
                    <span className="text-xs text-muted-foreground">
                      {c.productCount}
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>
      </section>

      <Separator />

      {/* Price range */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">Price range</h3>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Min"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Max"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={() => setParams({ minPrice: min || null, maxPrice: max || null })}
        >
          Apply price
        </Button>
      </section>

      <Separator />

      {/* Sort */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">Sort by</h3>
        <div className="mt-3">
          <Select
            value={currentSort}
            onValueChange={(value) => {
              if (!value) return;
              const [sortBy, sortOrder] = value.split(":");
              setParams({ sortBy, sortOrder });
            }}
          >
            <SelectTrigger size="sm" className="w-full" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setMin("");
            setMax("");
            router.push(pathname);
          }}
        >
          Clear all filters
        </Button>
      )}
    </div>
  );
}

/** Mobile entry point: a button that opens the filters in a Sheet. */
export function MobileProductFilters(props: ProductFiltersProps) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="lg:hidden" />
        }
      >
        <SlidersHorizontal />
        Filters
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-4">
          <ProductFilters {...props} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
