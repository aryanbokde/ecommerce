"use client";

import Image from "next/image";

const LOGOS = Array.from(
  { length: 8 },
  (_, i) => `https://picsum.photos/120/60?random=${40 + i}`
);

// Infinite auto-scrolling logo strip. The track holds two copies of the logos
// and animates -50% (see `.animate-marquee` in globals.css) for a seamless loop;
// pauses on hover.
export function BrandMarquee() {
  const track = [...LOGOS, ...LOGOS];
  return (
    <section className="border-y border-border bg-card py-8">
      <div className="group mx-auto max-w-7xl overflow-hidden px-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max animate-marquee items-center gap-12 group-hover:[animation-play-state:paused]">
          {track.map((src, i) => (
            <Image
              key={i}
              src={src}
              alt="Brand logo"
              width={120}
              height={60}
              unoptimized
              aria-hidden={i >= LOGOS.length}
              className="h-9 w-auto shrink-0 opacity-50 grayscale transition-opacity duration-300 hover:opacity-100"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
