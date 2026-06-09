"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Global support search — orders + customers. Submitting routes to Order Lookup
// with the query; the lookup page resolves whether it's an order number, email,
// or name. Shared by the topbar (compact) and the dashboard (prominent).
export function SupportSearch({
  size = "sm",
  className,
}: {
  size?: "sm" | "lg";
  className?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/support/orders?q=${encodeURIComponent(q)}`);
  }

  const lg = size === "lg";

  return (
    <form onSubmit={onSubmit} className={cn("relative", className)} role="search">
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
          lg ? "left-3.5 size-5" : "left-2.5 size-4"
        )}
      />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={
          lg
            ? "Search orders or customers — order #, email, or name…"
            : "Search orders or customers…"
        }
        aria-label="Search orders or customers"
        className={cn(lg ? "h-12 pl-11 text-base" : "h-8 w-56 pl-8")}
      />
    </form>
  );
}
