"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import type { Product } from "@/types";

const STORAGE_KEY = "recentlyViewed";

function readSlugs(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

export function RecentlyViewed() {
  // null = still resolving localStorage; [] = nothing to show.
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    // NOTE: there's no batch "products by slug" API yet, so we pull the catalog
    // and filter client-side, preserving the recently-viewed order. See the flag
    // in the summary — a GET /api/products?slugs=… endpoint would be cleaner.
    async function load() {
      const slugs = readSlugs();
      if (slugs.length === 0) {
        if (!cancelled) setProducts([]);
        return;
      }
      try {
        // Active only — a product deactivated since it was viewed must drop off.
        const res = await fetch("/api/products?limit=100&isActive=true");
        const json = res.ok ? await res.json() : null;
        if (cancelled) return;
        const all: Product[] = json?.data?.products ?? [];
        const bySlug = new Map(all.map((p) => [p.slug, p]));
        setProducts(
          slugs
            .map((s) => bySlug.get(s))
            .filter((p): p is Product => !!p)
        );
      } catch {
        if (!cancelled) setProducts([]);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Loading bars while resolving (only if we actually have slugs to fetch).
  if (products === null) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Recently Viewed
        </h2>
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-44 shrink-0">
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Skip entirely when there's nothing recently viewed.
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        Recently Viewed
      </h2>
      <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
        {products.map((product) => (
          <div key={product.id} className="w-44 shrink-0">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
