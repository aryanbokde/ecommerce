"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Slide {
  img: string;
  alt: string;
  eyebrow: string;
  headline: string;
  subtext: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
}

const SLIDES: Slide[] = [
  {
    img: "https://picsum.photos/1600/700?random=11",
    alt: "New season arrivals",
    eyebrow: "New Season",
    headline: "Style that moves with you",
    subtext: "Discover the latest drop — crafted for everyday comfort and standout looks.",
    primary: { label: "Shop Now", href: "/products" },
    secondary: { label: "Explore", href: "/shop" },
  },
  {
    img: "https://picsum.photos/1600/700?random=12",
    alt: "Tech deals",
    eyebrow: "Limited Time",
    headline: "Up to 40% off electronics",
    subtext: "Premium gadgets at prices you'll love. Free shipping on orders over ₹999.",
    primary: { label: "Shop Now", href: "/products" },
    secondary: { label: "Explore", href: "/shop?featured=true" },
  },
  {
    img: "https://picsum.photos/1600/700?random=13",
    alt: "Home essentials",
    eyebrow: "Everyday Essentials",
    headline: "Make your space yours",
    subtext: "Thoughtful home & kitchen picks, delivered to your door with care.",
    primary: { label: "Shop Now", href: "/products" },
    secondary: { label: "Explore", href: "/shop" },
  },
];

export function HeroSlider() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    // Initialise via a timer so no setState runs synchronously in the effect body.
    const id = setTimeout(onSelect, 0);
    return () => {
      clearTimeout(id);
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const active = SLIDES[selected];

  return (
    <section
      aria-label="Featured promotions"
      className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden bg-muted"
    >
      {/* Carousel viewport (background images) */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex h-[60vh] md:h-[50vh] lg:h-[70vh]">
          {SLIDES.map((s) => (
            <div
              key={s.img}
              role="img"
              aria-label={s.alt}
              className="relative min-w-0 flex-[0_0_100%] bg-cover bg-center"
              style={{ backgroundImage: `url(${s.img})` }}
            >
              {/* left→right dark gradient for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
            </div>
          ))}
        </div>
      </div>

      {/* Text overlay — crossfades + slides up on slide change */}
      <div className="pointer-events-none absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="pointer-events-auto max-w-xl text-white"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                {active.eyebrow}
              </p>
              <h1 className="font-heading font-bold leading-[1.05] tracking-tight text-[clamp(2rem,6vw,4rem)]">
                {active.headline}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/85 sm:text-base">
                {active.subtext}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button
                  render={<Link href={active.primary.href} />}
                  nativeButton={false}
                  size="lg"
                  className="h-11 px-6 text-sm sm:text-base"
                >
                  {active.primary.label}
                </Button>
                <Button
                  render={<Link href={active.secondary.href} />}
                  nativeButton={false}
                  variant="outline"
                  size="lg"
                  className="h-11 border-white/40 bg-transparent px-6 text-sm text-white hover:bg-white/10 hover:text-white sm:text-base"
                >
                  {active.secondary.label}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Arrows (desktop/tablet only) */}
      <button
        type="button"
        onClick={scrollPrev}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/15 p-2.5 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/25 md:flex"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={scrollNext}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/15 p-2.5 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/25 md:flex"
      >
        <ChevronRight className="size-5" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.img}
            type="button"
            onClick={() => scrollTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === selected}
            className={cn(
              "h-2 rounded-full bg-white/50 transition-all duration-300 hover:bg-white/80",
              i === selected ? "w-6 bg-white" : "w-2"
            )}
          />
        ))}
      </div>
    </section>
  );
}
