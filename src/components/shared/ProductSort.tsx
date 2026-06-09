"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// value = "<sortBy>:<sortOrder>" so a single Select drives both URL params.
export const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest" },
  { value: "price:asc", label: "Price: Low to High" },
  { value: "price:desc", label: "Price: High to Low" },
  { value: "reviews:desc", label: "Most Reviewed" },
] as const;

const DEFAULT_SORT = "createdAt:desc";

export function ProductSort() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";
  const current = `${sortBy}:${sortOrder}`;

  function onChange(value: string | null) {
    if (!value) return;
    const [nextSortBy, nextSortOrder] = value.split(":");
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", nextSortBy);
    params.set("sortOrder", nextSortOrder);
    params.delete("page"); // back to page 1 on sort change
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select
      value={SORT_OPTIONS.some((o) => o.value === current) ? current : DEFAULT_SORT}
      onValueChange={onChange}
    >
      <SelectTrigger size="sm" aria-label="Sort products" className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
