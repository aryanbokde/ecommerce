"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BannerCardVariant = "split" | "overlay" | "minimal";

interface BannerCardProps {
  title: string;
  subtitle?: string;
  image?: string;
  href: string;
  cta: string;
  variant?: BannerCardVariant;
  /** Alternate text/image sides for the "split" variant. */
  reverse?: boolean;
  /** Gradient palette seed for the "minimal" variant. */
  index?: number;
  className?: string;
}

const BANNER_GRADIENTS = [
  "from-[#FB8500] to-[#E07700]", // orange
  "from-[#219EBC] to-[#023047]", // blue → navy
  "from-[#FFB703] to-[#FB8500]", // yellow → orange
  "from-[#8ECAE6] to-[#219EBC]", // sky → blue
];

function CtaButton({ cta, light }: { cta: string; light?: boolean }) {
  return (
    <Button
      render={<span />}
      nativeButton={false}
      size="lg"
      className={cn(
        "relative z-10 mt-5 h-11 px-6 transition-transform duration-300 group-hover:scale-105",
        light && "bg-white text-foreground hover:bg-white/90"
      )}
    >
      {cta}
      <ArrowRight className="size-4" />
    </Button>
  );
}

export function BannerCard({
  title,
  subtitle,
  image,
  href,
  cta,
  variant = "split",
  reverse = false,
  index = 0,
  className,
}: BannerCardProps) {
  const img = image ?? `https://picsum.photos/800/600?random=${30 + index}`;

  // ── OVERLAY ──────────────────────────────────────────────────────────────────
  if (variant === "overlay") {
    return (
      <Link
        href={href}
        className={cn(
          "group relative flex min-h-56 items-end overflow-hidden rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md sm:min-h-64",
          className
        )}
      >
        <Image
          src={img}
          alt={title}
          fill
          unoptimized
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
        <div className="relative z-10 max-w-md p-6 sm:p-8">
          {subtitle && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
              {subtitle}
            </p>
          )}
          <h3 className="font-heading text-xl font-bold text-white sm:text-2xl">
            {title}
          </h3>
          <CtaButton cta={cta} light />
        </div>
      </Link>
    );
  }

  // ── MINIMAL (no image) ───────────────────────────────────────────────────────
  if (variant === "minimal") {
    const grad = BANNER_GRADIENTS[index % BANNER_GRADIENTS.length];
    return (
      <Link
        href={href}
        className={cn(
          "group relative flex min-h-48 flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br p-7 text-white shadow-sm transition-all duration-300 hover:shadow-md sm:p-9",
          grad,
          className
        )}
      >
        {subtitle && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
            {subtitle}
          </p>
        )}
        <h3 className="max-w-md font-heading text-2xl font-bold leading-tight sm:text-3xl">
          {title}
        </h3>
        <CtaButton cta={cta} light />
      </Link>
    );
  }

  // ── SPLIT (default) ──────────────────────────────────────────────────────────
  return (
    <Link
      href={href}
      className={cn(
        "group grid overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md md:grid-cols-2",
        className
      )}
    >
      {/* Text */}
      <div
        className={cn(
          "flex flex-col justify-center p-7 sm:p-9",
          reverse && "md:order-2"
        )}
      >
        {subtitle && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {subtitle}
          </p>
        )}
        <h3 className="font-heading text-xl font-bold text-foreground sm:text-2xl">
          {title}
        </h3>
        <CtaButton cta={cta} />
      </div>

      {/* Image */}
      <div
        className={cn(
          "relative min-h-44 sm:min-h-56",
          reverse && "md:order-1"
        )}
      >
        <Image
          src={img}
          alt={title}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
    </Link>
  );
}
