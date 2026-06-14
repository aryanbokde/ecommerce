"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeading } from "./SectionHeading";
import { formatPrice } from "@/components/shared/ProductCard";
import type { Product } from "@/types";

interface Remaining {
  h: string;
  m: string;
  s: string;
}

function timeToMidnight(): Remaining {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  let diff = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  diff %= 3600;
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { h: pad(h), m: pad(m), s: pad(s) };
}

function CountdownBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="flex min-w-11 items-center justify-center rounded-lg bg-white/15 px-2 py-1.5 font-mono text-lg font-bold tabular-nums text-white backdrop-blur sm:text-xl">
        {value}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-wide text-white/70">
        {label}
      </span>
    </div>
  );
}

export function DealOfTheDaySection() {
  const [deal, setDeal] = useState<Product | null | undefined>(undefined); // undefined = loading
  const [left, setLeft] = useState<Remaining | null>(null);

  // Pick the first featured, discounted product.
  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const res = await fetch("/api/products/featured?limit=12", {
          credentials: "include",
        });
        const json = res.ok ? await res.json() : null;
        const list: Product[] = json?.data ?? [];
        const found = list.find(
          (p) =>
            p.comparePrice != null &&
            Number(p.comparePrice) > Number(p.price) &&
            (p.stock ?? 0) > 0
        );
        if (!cancelled) setDeal(found ?? null);
      } catch {
        if (!cancelled) setDeal(null);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, []);

  // Live countdown (reset daily at midnight).
  useEffect(() => {
    const tick = setTimeout(() => setLeft(timeToMidnight()), 0);
    const id = setInterval(() => setLeft(timeToMidnight()), 1000);
    return () => {
      clearTimeout(tick);
      clearInterval(id);
    };
  }, []);

  if (deal === null) return null; // no deal → hide section entirely

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Limited time" title="Deal of the Day" />

        {deal === undefined ? (
          <Skeleton className="h-72 w-full rounded-2xl" />
        ) : (
          <DealCard deal={deal} left={left} />
        )}
      </div>
    </section>
  );
}

function DealCard({ deal, left }: { deal: Product; left: Remaining | null }) {
  const price = Number(deal.price);
  const compare = Number(deal.comparePrice);
  const savings = Math.round((1 - price / compare) * 100);
  const image = deal.images?.[0] ?? null;

  return (
    <div className="grid overflow-hidden rounded-2xl shadow-sm md:grid-cols-2">
      {/* Image */}
      <div className="relative min-h-56 bg-muted md:min-h-72">
        {image && (
          <Image
            src={image}
            alt={deal.name}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        )}
        <span className="absolute left-4 top-4 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
          {savings}% OFF
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-col justify-center bg-gradient-to-br from-[#023047] to-[#219EBC] p-7 text-white sm:p-9">
        {deal.category?.name && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
            {deal.category.name}
          </p>
        )}
        <h3 className="font-heading text-2xl font-bold leading-tight sm:text-3xl">
          {deal.name}
        </h3>

        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-2xl font-bold">{formatPrice(price)}</span>
          <span className="text-base text-white/60 line-through">
            {formatPrice(compare)}
          </span>
        </div>

        {/* Countdown */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/70">
            Hurry — offer ends in
          </p>
          <div className="flex items-center gap-2">
            <CountdownBox value={left?.h ?? "--"} label="Hrs" />
            <span className="pb-4 text-lg font-bold text-white/60">:</span>
            <CountdownBox value={left?.m ?? "--"} label="Min" />
            <span className="pb-4 text-lg font-bold text-white/60">:</span>
            <CountdownBox value={left?.s ?? "--"} label="Sec" />
          </div>
        </div>

        <Button
          render={<Link href={`/products/${deal.slug}`} />}
          nativeButton={false}
          size="lg"
          className="mt-6 h-11 w-fit bg-white px-6 text-foreground transition-transform duration-300 hover:scale-105 hover:bg-white/90"
        >
          Grab the deal
        </Button>
      </div>
    </div>
  );
}
