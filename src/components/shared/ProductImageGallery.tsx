"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, Expand } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageGalleryProps {
  images: string[];
  name: string;
}

export function ProductImageGallery({ images, name }: ProductImageGalleryProps) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  if (!images || images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
        <ImageIcon className="size-10" />
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];
  const hasThumbs = images.length > 1;

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
      {/* Thumbnail rail — horizontal on mobile, vertical on sm+ */}
      {hasThumbs && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 sm:w-20 sm:shrink-0 sm:flex-col sm:overflow-y-auto sm:overflow-x-visible sm:pb-0">
          {images.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "relative aspect-square size-16 shrink-0 overflow-hidden rounded-xl border bg-muted transition-all sm:size-auto sm:w-full",
                i === active
                  ? "border-foreground ring-2 ring-foreground/15"
                  : "border-border opacity-70 hover:opacity-100"
              )}
            >
              <Image
                src={img}
                alt=""
                fill
                unoptimized
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main image — next/image (priority = LCP). Hover to magnify. */}
      <div
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={onMouseMove}
        className="group relative aspect-square min-w-0 flex-1 cursor-zoom-in overflow-hidden rounded-2xl border border-border bg-muted"
      >
        <Image
          src={current}
          alt={name}
          fill
          priority
          unoptimized
          sizes="(max-width: 1024px) 100vw, 45vw"
          className="object-cover transition-transform duration-200 ease-out"
          style={
            zoom
              ? { transform: "scale(2)", transformOrigin: `${pos.x}% ${pos.y}%` }
              : undefined
          }
        />

        {/* Zoom hint + image counter */}
        <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-[11px] font-medium text-muted-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
          <Expand className="size-3" />
          Hover to zoom
        </span>
        {hasThumbs && (
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground backdrop-blur">
            {active + 1} / {images.length}
          </span>
        )}
      </div>
    </div>
  );
}
