import { Suspense } from "react";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { SectionHeading } from "./SectionHeading";
import type { Product } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function getFeatured(): Promise<Product[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/products/featured?limit=5`, {
      next: { tags: ["products", "featured-products"], revalidate: 120 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data ?? []) as Product[];
  } catch {
    return [];
  }
}

function FeaturedSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ProductCardSkeleton variant="featured" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductCardSkeleton key={i} variant="default" />
        ))}
      </div>
    </div>
  );
}

async function FeaturedContent() {
  const products = await getFeatured();
  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        No featured products yet — check back soon.
      </p>
    );
  }

  const [hero, ...rest] = products;
  const grid = rest.slice(0, 4);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ProductCard product={hero} variant="featured" priority />
      <div className="grid grid-cols-2 gap-4">
        {grid.map((p) => (
          <ProductCard key={p.id} product={p} variant="default" />
        ))}
      </div>
    </div>
  );
}

export function FeaturedSection() {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Handpicked"
          title="Featured Products"
          action={{ label: "View all", href: "/products?isFeatured=true" }}
        />
        <Suspense fallback={<FeaturedSkeleton />}>
          <FeaturedContent />
        </Suspense>
      </div>
    </section>
  );
}
