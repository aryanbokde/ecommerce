import type { Metadata } from "next";
import { ProductGrid } from "@/components/shared/ProductGrid";
import { Pagination } from "@/components/shared/Pagination";
import { ProductSort } from "@/components/shared/ProductSort";
import {
  ProductFilters,
  MobileProductFilters,
} from "@/components/shared/ProductFilters";
import type { Product, Category } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const PAGE_SIZE = 12;

type SearchParams = Record<string, string | string[] | undefined>;

const FILTER_KEYS = [
  "page",
  "search",
  "categoryId",
  "minPrice",
  "maxPrice",
  "sortBy",
  "sortOrder",
] as const;

function readFilters(sp: SearchParams): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const v = sp[key];
    const value = Array.isArray(v) ? v[0] : v;
    if (value) result[key] = value;
  }
  return result;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const search = Array.isArray(sp.search) ? sp.search[0] : sp.search;
  const title = search ? `Search: "${search}"` : "All Products";
  return {
    title,
    description: search
      ? `Search results for "${search}" at MyShop.`
      : "Browse all products at MyShop.",
  };
}

async function fetchProducts(filters: Record<string, string>) {
  const params = new URLSearchParams(filters);
  params.set("limit", String(PAGE_SIZE));
  // Storefront only ever shows active products (the shared /api/products list
  // returns inactive ones too, for admin/manager management screens).
  params.set("isActive", "true");
  try {
    const res = await fetch(`${BASE_URL}/api/products?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return { products: [], total: 0, page: 1, totalPages: 0 };
    const json = await res.json();
    return json.data as {
      products: Product[];
      total: number;
      page: number;
      totalPages: number;
    };
  } catch {
    return { products: [], total: 0, page: 1, totalPages: 0 };
  }
}

async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/categories`, {
      next: { tags: ["categories"], revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filters = readFilters(sp);

  const [{ products, total, page, totalPages }, categories] = await Promise.all([
    fetchProducts(filters),
    fetchCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
        Products
      </h1>

      <div className="mt-6 flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <ProductFilters categories={categories} currentFilters={filters} />
        </aside>

        {/* Main column */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MobileProductFilters
                categories={categories}
                currentFilters={filters}
              />
              <p className="text-sm text-muted-foreground">
                {total} {total === 1 ? "product" : "products"}
              </p>
            </div>
            <ProductSort />
          </div>

          <div className="mt-6">
            <ProductGrid products={products} columns={3} />
          </div>

          <div className="mt-8">
            <Pagination page={page} totalPages={totalPages} />
          </div>
        </div>
      </div>
    </div>
  );
}
