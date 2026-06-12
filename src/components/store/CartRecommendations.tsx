"use client";

import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { SectionHeading } from "@/components/home/SectionHeading";
import type { Product } from "@/types";

interface Props {
  /** Product ids already in the cart — filtered out of the suggestions. */
  excludeIds: string[];
  title?: string;
  eyebrow?: string;
  limit?: number;
}

// Carousel slide width (mobile/tablet). Desktop switches to a fixed grid.
const SLIDE = "min-w-0 flex-[0_0_72%] sm:flex-[0_0_42%] md:flex-[0_0_32%]";

// Cross-sell strip for the cart page: top sellers minus what's already in the
// cart. Draggable embla carousel on mobile, a clean grid on desktop — using the
// shared ProductCard "default" variant so it matches the rest of the site.
// Renders nothing until it has at least one suggestion.
export function CartRecommendations({
  excludeIds,
  title = "You may also like",
  eyebrow = "Recommended for you",
  limit = 5,
}: Props) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [emblaRef] = useEmblaCarousel({ align: "start", loop: false });

  useEffect(() => {
    const ctrl = new AbortController();
    // Over-fetch so we still fill the row after dropping in-cart items.
    fetch(`/api/products/best-sellers?limit=${limit + excludeIds.length}`, {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        const all: Product[] = j?.data ?? [];
        const exclude = new Set(excludeIds);
        setProducts(all.filter((p) => !exclude.has(p.id)).slice(0, limit));
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setProducts([]);
      });
    return () => ctrl.abort();
    // excludeIds identity changes each render — join to a stable key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeIds.join(","), limit]);

  if (products === null) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={eyebrow} title={title} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-5">
          {Array.from({ length: limit }).map((_, i) => (
            <ProductCardSkeleton key={i} variant="default" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading eyebrow={eyebrow} title={title} />

      {/* Mobile / tablet: draggable carousel */}
      <div className="lg:hidden">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4">
            {products.map((product) => (
              <div key={product.id} className={SLIDE}>
                <ProductCard product={product} variant="default" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: grid */}
      <div className="hidden gap-5 lg:grid lg:grid-cols-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} variant="default" />
        ))}
      </div>
    </section>
  );
}
