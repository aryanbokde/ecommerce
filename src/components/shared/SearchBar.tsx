"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 400;
const MAX_RESULTS = 6;

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  images: unknown;
}

function firstImage(images: unknown): string | null {
  if (Array.isArray(images) && typeof images[0] === "string") return images[0];
  return null;
}

function formatPrice(value: string | number): string {
  return `$${Number(value).toFixed(2)}`;
}

export function SearchBar() {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[] | null>(null);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const showDropdown = expanded && trimmed.length >= MIN_CHARS;

  // Focus the input when the bar expands.
  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  // Debounced search. All state updates happen inside the timeout/promise
  // callbacks (never synchronously in the effect body), and a `cancelled` flag
  // discards stale responses from superseded keystrokes.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (trimmed.length < MIN_CHARS) {
        setResults(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=${MAX_RESULTS}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (!cancelled) setResults(json?.data?.products ?? []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  // Close on click outside.
  useEffect(() => {
    if (!expanded) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [expanded]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      setExpanded(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search products…"
        aria-label="Search products"
        className={cn(
          "h-8 rounded-md border border-input bg-background text-sm outline-none transition-all duration-200 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          expanded
            ? "w-44 px-3 opacity-100 sm:w-64"
            : "pointer-events-none w-0 border-transparent px-0 opacity-0"
        )}
      />

      <Button
        variant="ghost"
        size="icon"
        aria-label={expanded ? "Close search" : "Search"}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? <X /> : <Search />}
      </Button>

      {showDropdown && (
        <div
          role="listbox"
          className="absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
        >
          {loading ? (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-1">
                  <Skeleton className="size-10 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : results && results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No products found for &ldquo;{trimmed}&rdquo;
            </p>
          ) : (
            <>
              <ul className="max-h-80 overflow-y-auto p-1">
                {(results ?? []).slice(0, MAX_RESULTS).map((product) => {
                  const img = firstImage(product.images);
                  return (
                    <li key={product.id}>
                      <Link
                        href={`/products/${product.slug}`}
                        onClick={() => setExpanded(false)}
                        className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            <Search className="size-4 text-muted-foreground" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {product.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {formatPrice(product.price)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link
                href={`/products?search=${encodeURIComponent(trimmed)}`}
                onClick={() => setExpanded(false)}
                className="flex items-center justify-center gap-1.5 border-t border-border px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-muted"
              >
                {loading && <Loader2 className="size-3.5 animate-spin" />}
                See all results
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
