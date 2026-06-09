import { PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import type { Product } from "@/types";

// Responsive column classes per `columns` prop (always 1 col on mobile).
const COLUMN_CLASSES: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  columns?: 2 | 3 | 4;
}

export function ProductGrid({
  products,
  loading = false,
  columns = 4,
}: ProductGridProps) {
  const gridClass = cn("grid grid-cols-1 gap-4", COLUMN_CLASSES[columns]);

  if (loading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: columns * 2 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-20 text-center">
        <PackageSearch className="size-10 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No products found</p>
        <p className="text-xs text-muted-foreground">
          Try adjusting your filters or search.
        </p>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
