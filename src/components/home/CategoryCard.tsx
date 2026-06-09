"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Shirt,
  Laptop,
  Home,
  BookOpen,
  ShoppingBag,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

export type CategoryCardVariant = "overlay" | "circle" | "gradient" | "minimal";

const GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-blue-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-purple-600",
];

const ICONS = [Shirt, Laptop, Home, BookOpen, ShoppingBag, Sparkles];

interface CategoryCardProps {
  category: Category;
  variant?: CategoryCardVariant;
  /** Drives gradient/icon rotation + the fallback image seed. */
  index?: number;
  priority?: boolean;
  className?: string;
}

export function CategoryCard({
  category,
  variant = "overlay",
  index = 0,
  priority = false,
  className,
}: CategoryCardProps) {
  const href = `/products?categoryId=${category.id}`;
  const img =
    category.image ?? `https://picsum.photos/400/400?random=${20 + index}`;
  const count = category.productCount;
  const countText =
    count != null ? `${count} ${count === 1 ? "item" : "items"}` : null;

  // ── CIRCLE ───────────────────────────────────────────────────────────────────
  if (variant === "circle") {
    return (
      <Link
        href={href}
        className={cn("group flex w-24 flex-col items-center gap-2 sm:w-auto", className)}
      >
        <div className="relative aspect-square w-20 overflow-hidden rounded-full bg-muted ring-1 ring-border transition-all duration-300 group-hover:ring-primary/40 sm:w-24">
          <Image
            src={img}
            alt={category.name}
            fill
            unoptimized
            priority={priority}
            sizes="96px"
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
        <div className="text-center">
          <p className="line-clamp-1 text-sm font-medium text-foreground">
            {category.name}
          </p>
          {countText && (
            <p className="text-xs text-muted-foreground">{countText}</p>
          )}
        </div>
      </Link>
    );
  }

  // ── GRADIENT (no image) ──────────────────────────────────────────────────────
  if (variant === "gradient") {
    const Icon = ICONS[index % ICONS.length];
    const grad = GRADIENTS[index % GRADIENTS.length];
    return (
      <Link
        href={href}
        className={cn(
          "group relative flex aspect-square flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-sm transition-all duration-300 hover:shadow-md",
          grad,
          className
        )}
      >
        <Icon className="size-9 opacity-90 transition-transform duration-300 group-hover:-translate-y-0.5" />
        <div>
          <p className="line-clamp-1 font-heading text-base font-semibold">
            {category.name}
          </p>
          {countText && <p className="text-xs text-white/80">{countText}</p>}
        </div>
        <ArrowRight className="absolute right-4 top-4 size-4 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
      </Link>
    );
  }

  // ── MINIMAL ──────────────────────────────────────────────────────────────────
  if (variant === "minimal") {
    return (
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md",
          className
        )}
      >
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image
            src={img}
            alt={category.name}
            fill
            unoptimized
            priority={priority}
            sizes="48px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-medium text-foreground">
            {category.name}
          </p>
          {countText && (
            <p className="text-xs text-muted-foreground">{countText}</p>
          )}
        </div>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary" />
      </Link>
    );
  }

  // ── OVERLAY (default) ────────────────────────────────────────────────────────
  return (
    <Link
      href={href}
      className={cn(
        "group relative block aspect-square overflow-hidden rounded-2xl bg-muted shadow-sm transition-all duration-300 hover:shadow-md",
        className
      )}
    >
      <Image
        src={img}
        alt={category.name}
        fill
        unoptimized
        priority={priority}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 transition-transform duration-300 group-hover:-translate-y-1">
        <p className="font-heading text-base font-semibold text-white sm:text-lg">
          {category.name}
        </p>
        {countText && (
          <p className="mt-0.5 text-xs text-white/80">{countText}</p>
        )}
      </div>
    </Link>
  );
}
