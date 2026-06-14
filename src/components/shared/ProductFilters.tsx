"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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
  /**
   * Which URL param drives category selection + which category field to match.
   * The /products listing filters by `categoryId`; the /shop category view is
   * keyed by `category` (slug). Defaults to id-based.
   */
  categoryParam?: "categoryId" | "category";
  /** Currently-selected category value (id or slug, matching categoryParam). */
  activeCategoryValue?: string;
}

export function ProductFilters({
  categories,
  currentFilters,
  categoryParam = "categoryId",
  activeCategoryValue,
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
  const activeCategory =
    activeCategoryValue ??
    (categoryParam === "categoryId" ? currentFilters.categoryId : undefined);
  const hasFilters = Boolean(
    activeCategory ||
      currentFilters.minPrice ||
      currentFilters.maxPrice ||
      currentFilters.search
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Categories — grouped (parent → children) with the active one highlighted.
          Selecting a parent filters its whole subtree; clicking the active row
          again clears it. */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">Categories</h3>
        <div className="mt-3 flex flex-col gap-1">
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground">No categories</p>
          ) : (
            categories.map((parent) => {
              const kids = parent.children ?? [];
              const subtotal =
                (parent.productCount ?? 0) +
                kids.reduce((s, k) => s + (k.productCount ?? 0), 0);
              return (
                <div key={parent.id}>
                  <CategoryRow
                    name={parent.name}
                    count={subtotal}
                    value={categoryParam === "category" ? parent.slug : parent.id}
                    active={activeCategory}
                    bold
                    onSelect={(v, isActive) =>
                      setParams({ [categoryParam]: isActive ? null : v })
                    }
                  />
                  {kids.length > 0 && (
                    <div className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2">
                      {kids.map((child) => (
                        <CategoryRow
                          key={child.id}
                          name={child.name}
                          count={child.productCount ?? 0}
                          value={
                            categoryParam === "category" ? child.slug : child.id
                          }
                          active={activeCategory}
                          onSelect={(v, isActive) =>
                            setParams({ [categoryParam]: isActive ? null : v })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
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

// One clickable category row (parent or child). Highlights when it's the
// active filter; clicking the active row again clears the filter.
function CategoryRow({
  name,
  count,
  value,
  active,
  bold,
  onSelect,
}: {
  name: string;
  count: number;
  value: string;
  active?: string;
  bold?: boolean;
  onSelect: (value: string, isActive: boolean) => void;
}) {
  const isActive = active === value;
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={() => onSelect(value, isActive)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-primary/10 font-medium text-primary"
          : bold
            ? "font-medium text-foreground hover:bg-muted"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span className="flex-1 truncate text-left">{name}</span>
      <span className="text-xs tabular-nums opacity-70">{count}</span>
    </button>
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
