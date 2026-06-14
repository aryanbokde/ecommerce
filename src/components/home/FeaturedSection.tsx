import { Suspense } from "react";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { SectionHeading } from "./SectionHeading";
import { getFeaturedProducts } from "@/server/services/product.service";
import type { Product } from "@/types";

// Direct service call — a Server Component must NOT fetch its own API route
// (deadlocks / a wrong NEXT_PUBLIC_APP_URL on the host returns nothing). JSON-
// serialize so Prisma Decimals/Dates arrive as plain values for the client card.
async function getFeatured(): Promise<Product[]> {
  try {
    const products = await getFeaturedProducts(5);
    return JSON.parse(JSON.stringify(products)) as Product[];
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
