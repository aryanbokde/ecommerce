"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Shape we need from GET /api/categories (nested tree with counts).
type Category = {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
  children?: Category[];
};

interface CategoryNavProps {
  /** Horizontal mega menu (desktop) or a stacked grouped list (mobile sheet). */
  orientation?: "horizontal" | "vertical";
  /** Called after a category link is clicked — used to close the mobile sheet. */
  onNavigate?: () => void;
}

/** Total products in a category, including all descendants. */
function totalCount(c: Category): number {
  const own = c.productCount ?? 0;
  const kids = c.children?.reduce((s, ch) => s + totalCount(ch), 0) ?? 0;
  return own + kids;
}

/** Children that actually contain products (recursively). */
function nonEmptyChildren(c: Category): Category[] {
  return (c.children ?? []).filter((ch) => totalCount(ch) > 0);
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
        className={cn("flex gap-2", orientation === "vertical" && "flex-col")}
        aria-hidden
      >
        {Array.from({ length: orientation === "vertical" ? 5 : 2 }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-8", orientation === "vertical" ? "w-full" : "w-24")}
          />
        ))}
      </div>
    );
  }

  // Only top-level categories that have products somewhere beneath them.
  const parents = categories.filter((c) => totalCount(c) > 0);
  if (parents.length === 0) return null;

  // ── Mobile: grouped, stacked list ──────────────────────────────────────────
  if (orientation === "vertical") {
    return (
      <nav className="flex flex-col gap-4">
        <Link
          href="/products"
          onClick={onNavigate}
          className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          All Products
        </Link>
        {parents.map((parent) => {
          const kids = nonEmptyChildren(parent);
          return (
            <div key={parent.id} className="flex flex-col">
              <Link
                href={`/shop?category=${parent.slug}`}
                onClick={onNavigate}
                className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {parent.name}
              </Link>
              <div className="mt-1 flex flex-col">
                {(kids.length > 0 ? kids : [parent]).map((c) => (
                  <Link
                    key={c.id}
                    href={`/shop?category=${c.slug}`}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      activeSlug === c.slug && "bg-muted font-medium text-foreground"
                    )}
                  >
                    <span>{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {totalCount(c)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    );
  }

  // ── Desktop: one mega panel PER top-level category ─────────────────────────
  return (
    <NavigationMenu>
      <NavigationMenuList>
        {parents.map((parent) => {
          const kids = nonEmptyChildren(parent);
          const parentActive =
            activeSlug === parent.slug ||
            kids.some((k) => k.slug === activeSlug);

          // Leaf parent (its own products, no subcategories) → plain link.
          if (kids.length === 0) {
            return (
              <NavigationMenuItem key={parent.id}>
                <NavigationMenuLink
                  render={<Link href={`/shop?category=${parent.slug}`} />}
                  className={cn(
                    "px-3 text-muted-foreground hover:text-foreground",
                    parentActive && "font-medium text-foreground"
                  )}
                >
                  {parent.name}
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          }

          return (
            <NavigationMenuItem key={parent.id}>
              <NavigationMenuTrigger
                className={cn(
                  "text-muted-foreground data-popup-open:text-foreground",
                  parentActive && "text-foreground"
                )}
              >
                {parent.name}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="flex w-[min(90vw,620px)] gap-6 p-5">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/shop?category=${parent.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:text-brand-blue"
                    >
                      Shop all {parent.name}
                      <ArrowRight className="size-3.5" />
                    </Link>
                    <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                      {kids.map((c) => (
                        <li key={c.id}>
                          <NavigationMenuLink
                            render={<Link href={`/shop?category=${c.slug}`} />}
                            className={cn(
                              "justify-between text-muted-foreground",
                              activeSlug === c.slug &&
                                "bg-muted/60 font-medium text-foreground"
                            )}
                          >
                            <span className="truncate">{c.name}</span>
                            <span className="ml-2 shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              {totalCount(c)}
                            </span>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Featured promo tile for this category */}
                  <Link
                    href={`/shop?category=${parent.slug}`}
                    className="group relative hidden w-44 shrink-0 flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br from-[#023047] via-[#219EBC] to-[#8ECAE6] p-4 text-white sm:flex"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                      {parent.name}
                    </span>
                    <span className="mt-1 font-heading text-base font-semibold leading-tight">
                      Explore the range
                    </span>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium">
                      Shop all
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          );
        })}

        <NavigationMenuItem>
          <NavigationMenuLink
            render={<Link href="/products" />}
            className="px-3 text-muted-foreground hover:text-foreground"
          >
            All Products
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
