import { Skeleton } from "@/components/ui/skeleton";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";

// Route-level loading UI for the products page (filter sidebar + 12 cards).
export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-40" />

      <div className="mt-6 flex gap-8">
        {/* Sidebar skeleton */}
        <aside className="hidden w-64 shrink-0 flex-col gap-6 lg:flex">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </aside>

        {/* Grid skeleton */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-44" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
