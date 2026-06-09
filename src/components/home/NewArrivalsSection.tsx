"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { SectionHeading } from "./SectionHeading";
import type { Product } from "@/types";

const SLIDE = "min-w-0 flex-[0_0_72%] sm:flex-[0_0_42%] md:flex-[0_0_30%] lg:flex-[0_0_23%]";

export function NewArrivalsSection() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: false });

  // Fetch on mount (deferred so no setState runs synchronously in the effect).
  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          "/api/products?sortBy=createdAt&sortOrder=desc&limit=10&isActive=true",
          { credentials: "include" }
        );
        const json = res.ok ? await res.json() : null;
        if (!cancelled) setProducts(json?.data?.products ?? []);
      } catch {
        if (!cancelled) setProducts([]);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, []);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const loading = products === null;
  const empty = products !== null && products.length === 0;

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Just in"
          title="New Arrivals"
          action={{ label: "View all", href: "/products?sortBy=createdAt&sortOrder=desc" }}
        />

        {empty ? (
          <p className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Nothing new right now — check back soon.
          </p>
        ) : (
          <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex gap-4">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={SLIDE}>
                        <ProductCardSkeleton variant="default" />
                      </div>
                    ))
                  : products.map((p) => (
                      <div key={p.id} className={SLIDE}>
                        <ProductCard product={p} variant="default" />
                      </div>
                    ))}
              </div>
            </div>

            {!loading && (
              <>
                <button
                  type="button"
                  onClick={scrollPrev}
                  aria-label="Previous"
                  className="absolute -left-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background p-2 text-foreground shadow-sm transition-all duration-300 hover:bg-muted md:flex"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={scrollNext}
                  aria-label="Next"
                  className="absolute -right-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background p-2 text-foreground shadow-sm transition-all duration-300 hover:bg-muted md:flex"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
