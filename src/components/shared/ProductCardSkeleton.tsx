import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ProductCardVariant } from "./ProductCard";

interface Props {
  variant?: ProductCardVariant;
  className?: string;
}

/** Loading placeholder that mirrors each ProductCard variant's shape. */
export function ProductCardSkeleton({ variant = "default", className }: Props) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-lg border border-border bg-card",
          className
        )}
      >
        <Skeleton className="aspect-square w-full rounded-none" />
        <div className="flex flex-col gap-2 p-2.5">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3.5 w-1/3" />
        </div>
      </div>
    );
  }

  if (variant === "horizontal") {
    return (
      <div
        className={cn(
          "flex gap-3 rounded-xl border border-border bg-card p-2.5",
          className
        )}
      >
        <Skeleton className="size-24 shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2 py-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-auto h-7 w-20 self-end" />
        </div>
      </div>
    );
  }

  if (variant === "featured") {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border bg-card",
          className
        )}
      >
        <Skeleton className="aspect-[4/5] w-full rounded-none sm:aspect-[3/4]" />
      </div>
    );
  }

  // default
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-card",
        className
      )}
    >
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        {/* eyebrow */}
        <Skeleton className="h-3 w-16" />
        {/* name (2 lines) */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        {/* rating */}
        <Skeleton className="h-3.5 w-24" />
        {/* price */}
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}
