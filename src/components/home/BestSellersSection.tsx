import { Suspense } from "react";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { SectionHeading } from "./SectionHeading";
import type { Product } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function getBestSellers(): Promise<Product[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/products/best-sellers?limit=12`, {
      next: { tags: ["products", "best-sellers"], revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data ?? []) as Product[];
  } catch {
    return [];
  }
}

function BestSellersSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <ProductCardSkeleton key={i} variant="compact" />
      ))}
    </div>
  );
}

async function BestSellersContent() {
  const products = await getBestSellers();
  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        No sales data yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {products.map((p, i) => (
        <div key={p.id} className="flex flex-col">
          <ProductCard product={p} variant="compact" rank={i + 1} />
          {p.soldCount != null && p.soldCount > 0 && (
            <p className="mt-1.5 px-0.5 text-xs text-muted-foreground">
              {p.soldCount.toLocaleString("en-IN")} sold
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function BestSellersSection() {
  return (
    <section className="bg-muted/30 py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Crowd favourites"
          title="Best Sellers"
          action={{ label: "View all", href: "/products?sortBy=reviews" }}
        />
        <Suspense fallback={<BestSellersSkeleton />}>
          <BestSellersContent />
        </Suspense>
      </div>
    </section>
  );
}
