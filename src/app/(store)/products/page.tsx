import type { Metadata } from "next";
import { Package } from "lucide-react";
import { ProductGrid } from "@/components/shared/ProductGrid";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { ProductSort } from "@/components/shared/ProductSort";
import {
  ProductFilters,
  MobileProductFilters,
} from "@/components/shared/ProductFilters";
import type { Product, Category } from "@/types";
import { getCategoryTree } from "@/server/services/category.service";

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

// Categories come straight from the service (a Server Component must not fetch
// its own API route — that can deadlock and intermittently yields an empty
// sidebar). getCategoryTree returns plain, serializable nodes with counts.
async function fetchCategories(): Promise<Category[]> {
  try {
    return (await getCategoryTree()) as unknown as Category[];
  } catch {
    return [];
  }
}

/**
 * Flatten the category tree to the categories the sidebar can actually filter
 * by — i.e. those with at least one product of their own. Empty parents (e.g.
 * "Electronics", whose products live under "Smartphones"/"Laptops") are dropped
 * so the filter never offers a category that returns zero results.
 */
function flattenNonEmpty(tree: Category[]): Category[] {
  const out: Category[] = [];
  const walk = (nodes: Category[]) => {
    for (const node of nodes) {
      if ((node.productCount ?? 0) > 0) out.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(tree);
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filters = readFilters(sp);

  const [{ products, total, page, totalPages }, categoryTree] = await Promise.all([
    fetchProducts(filters),
    fetchCategories(),
  ]);
  const categories = flattenNonEmpty(categoryTree);

  return (
    <>
      <PageHeader
        title="All Products"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Products" }]}
        icon={Package}
        pill={`${total} ${total === 1 ? "product" : "products"}`}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-8">
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
    </>
  );
}
