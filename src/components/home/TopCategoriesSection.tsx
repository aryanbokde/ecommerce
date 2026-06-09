import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoriesWithCounts } from "@/server/services/category.service";
import { SectionHeading } from "./SectionHeading";
import { CategoryGrid } from "./CategoryGrid";
import type { Category } from "@/types";

function CategoriesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
      ))}
    </div>
  );
}

async function CategoriesContent() {
  const all = await getCategoriesWithCounts();
  // Show categories that actually have products, busiest first.
  const categories = all
    .filter((c) => c.productCount > 0)
    .slice(0, 8) as unknown as Category[];

  if (categories.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        No categories yet.
      </p>
    );
  }

  return (
    <>
      {/* Mobile: circular scroll-snap row */}
      <div className="sm:hidden">
        <CategoryGrid categories={categories} variant="circle" />
      </div>
      {/* Desktop: overlay grid */}
      <div className="hidden sm:block">
        <CategoryGrid categories={categories} variant="overlay" />
      </div>
    </>
  );
}

export function TopCategoriesSection() {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Browse"
          title="Shop by Category"
          subtitle="Find exactly what you're looking for."
          action={{ label: "All categories", href: "/shop" }}
        />
        <Suspense fallback={<CategoriesSkeleton />}>
          <CategoriesContent />
        </Suspense>
      </div>
    </section>
  );
}
