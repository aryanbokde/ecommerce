"use client";

import { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./SectionHeading";

interface Testimonial {
  name: string;
  role: string;
  rating: number;
  quote: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Aarav Sharma",
    role: "Verified buyer",
    rating: 5,
    quote:
      "Fast delivery and the quality blew me away. The whole checkout was smooth — easily my new go-to store.",
  },
  {
    name: "Priya Nair",
    role: "Verified buyer",
    rating: 5,
    quote:
      "Great prices and the packaging was so neat. Customer support sorted my query within minutes.",
  },
  {
    name: "Rohan Mehta",
    role: "Verified buyer",
    rating: 4,
    quote:
      "Loads of choice and honest product photos. What I ordered is exactly what arrived.",
  },
  {
    name: "Sneha Iyer",
    role: "Verified buyer",
    rating: 5,
    quote:
      "Returns were genuinely hassle-free. Refund hit my account in two days. Shopping here again for sure.",
  },
  {
    name: "Vikram Singh",
    role: "Verified buyer",
    rating: 5,
    quote:
      "The deals are unreal during sales. Snagged a phone at a price I couldn't find anywhere else.",
  },
];

const SLIDE = "min-w-0 flex-[0_0_88%] pl-4 sm:flex-[0_0_46%] lg:flex-[0_0_33%]";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TestimonialsSection() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: true });
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className="bg-muted/30 py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Loved by shoppers" title="What our customers say" />

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="-ml-4 flex">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className={SLIDE}>
                  <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <Quote className="size-7 text-primary/30" />
                    <div className="mt-2 flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "size-4",
                            i < t.rating
                              ? "fill-highlight text-highlight"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                    <blockquote className="mt-3 flex-1 text-sm leading-6 text-foreground">
                      “{t.quote}”
                    </blockquote>
                    <figcaption className="mt-5 flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {initials(t.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                          {t.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {t.role}
                        </span>
                      </span>
                    </figcaption>
                  </figure>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={scrollPrev}
            aria-label="Previous testimonial"
            className="absolute -left-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background p-2 text-foreground shadow-sm transition-all duration-300 hover:bg-muted md:flex"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            aria-label="Next testimonial"
            className="absolute -right-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background p-2 text-foreground shadow-sm transition-all duration-300 hover:bg-muted md:flex"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
