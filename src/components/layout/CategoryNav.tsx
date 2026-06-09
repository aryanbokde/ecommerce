"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Minimal shape we need from GET /api/categories (tree of top-level nodes).
type Category = { id: string; name: string; slug: string };

interface CategoryNavProps {
  /** Horizontal NavigationMenu (desktop) or a stacked link list (mobile sheet). */
  orientation?: "horizontal" | "vertical";
  /** Called after a category link is clicked — used to close the mobile sheet. */
  onNavigate?: () => void;
}

export function CategoryNav({
  orientation = "horizontal",
  onNavigate,
}: CategoryNavProps) {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const searchParams = useSearchParams();
  const activeSlug = searchParams.get("category");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled) {
          setCategories(Array.isArray(json?.data) ? json.data : []);
        }
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Loading → skeleton bars.
  if (categories === null) {
    return (
      <div
        className={cn(
          "flex gap-2",
          orientation === "vertical" && "flex-col"
        )}
        aria-hidden
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-8", orientation === "vertical" ? "w-full" : "w-20")}
          />
        ))}
      </div>
    );
  }

  if (categories.length === 0) return null;

  if (orientation === "vertical") {
    return (
      <nav className="flex flex-col gap-1">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/shop?category=${c.slug}`}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              activeSlug === c.slug && "bg-muted font-medium text-foreground"
            )}
          >
            {c.name}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <NavigationMenu>
      <NavigationMenuList>
        {categories.map((c) => (
          <NavigationMenuItem key={c.id}>
            <NavigationMenuLink
              render={<Link href={`/shop?category=${c.slug}`} />}
              className={cn(
                activeSlug === c.slug && "bg-muted/60 font-medium text-foreground"
              )}
            >
              {c.name}
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
