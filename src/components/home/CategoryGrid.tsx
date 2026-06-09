import { cn } from "@/lib/utils";
import type { Category } from "@/types";
import { CategoryCard, type CategoryCardVariant } from "./CategoryCard";

interface CategoryGridProps {
  categories: Category[];
  variant?: CategoryCardVariant;
  className?: string;
}

// Per-variant grid column rhythm.
const GRID_COLS: Record<Exclude<CategoryCardVariant, "circle">, string> = {
  overlay: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  gradient: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  minimal: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
};

export function CategoryGrid({
  categories,
  variant = "overlay",
  className,
}: CategoryGridProps) {
  // Circle: horizontal scroll-snap row on mobile, grid on larger screens.
  if (variant === "circle") {
    return (
      <div
        className={cn(
          "flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "sm:grid sm:snap-none sm:grid-cols-5 sm:overflow-visible lg:grid-cols-7",
          className
        )}
      >
        {categories.map((c, i) => (
          <div key={c.id} className="shrink-0 snap-start sm:shrink">
            <CategoryCard category={c} variant="circle" index={i} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", GRID_COLS[variant], className)}>
      {categories.map((c, i) => (
        <CategoryCard key={c.id} category={c} variant={variant} index={i} />
      ))}
    </div>
  );
}
