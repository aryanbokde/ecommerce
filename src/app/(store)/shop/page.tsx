import Link from "next/link";
import type { Metadata } from "next";
import { Layers, Store } from "lucide-react";
import { ProductGrid } from "@/components/shared/ProductGrid";
import { Pagination } from "@/components/shared/Pagination";
import { ProductSort } from "@/components/shared/ProductSort";
import {
  ProductFilters,
  MobileProductFilters,
} from "@/components/shared/ProductFilters";
import { PageHeader } from "@/components/layout/PageHeader";
import prisma from "@/server/db";
import { getProducts } from "@/server/services/product.service";
import {
  getCategoryAndDescendantIds,
  getNonEmptyCategoryTree,
} from "@/server/services/category.service";
import { productQuerySchema } from "@/server/validators/product.schema";
import type { Product, Category } from "@/types";

const PAGE_SIZE = 12;

type ShopSearchParams = {
  category?: string;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: string;
};

// A deterministic gradient per category id so cards without an image still feel
// distinct (and stable across renders).
// Palette-tinted soft gradients (sky · blue · navy · yellow · orange).
const GRADIENTS = [
  "from-[#8ECAE6] to-[#FFB703]",
  "from-[#8ECAE6] to-[#219EBC]",
  "from-[#219EBC] to-[#023047]",
  "from-[#FFB703] to-[#FB8500]",
  "from-[#FB8500] to-[#E07700]",
  "from-[#8ECAE6] to-[#FB8500]",
];
function gradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

interface CategoryWithMeta {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  productCount: number;
  children: { id: string; name: string; slug: string }[];
}

// Fetch active categories with direct product counts, assembled into a
// parent → children shape (one level deep, which is what the cards render).
async function getCategoriesWithCounts(): Promise<CategoryWithMeta[]> {
  try {
    const rows = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });

    const childrenByParent = new Map<
      string,
      { id: string; name: string; slug: string }[]
    >();
    for (const c of rows) {
      if (!c.parentId) continue;
      const list = childrenByParent.get(c.parentId) ?? [];
      list.push({ id: c.id, name: c.name, slug: c.slug });
      childrenByParent.set(c.parentId, list);
    }

    // A parent's card count = its own products + every descendant's, so empty
    // parents still show the right total (and never read as "0 products").
    const directCount = new Map(rows.map((c) => [c.id, c._count.products]));
    const subtreeCount = (id: string): number => {
      let sum = directCount.get(id) ?? 0;
      for (const child of childrenByParent.get(id) ?? [])
        sum += subtreeCount(child.id);
      return sum;
    };

    return rows
      .filter((c) => !c.parentId)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: c.image,
        parentId: c.parentId,
        productCount: subtreeCount(c.id),
        children: childrenByParent.get(c.id) ?? [],
      }));
  } catch {
    return [];
  }
}

async function getCategoryBySlug(slug: string) {
  try {
    const category = await prisma.category.findFirst({
      where: { slug, isActive: true },
      include: { _count: { select: { products: true } } },
    });
    if (!category) return null;
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      productCount: category._count.products,
    };
  } catch {
    return null;
  }
}

type ProductListResult = {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
};

// Category products with the same filter/sort/pagination knobs as /products.
// Calls the service DIRECTLY (a Server Component must NOT fetch its own API
// route — that can deadlock and, when NEXT_PUBLIC_APP_URL is wrong on a host,
// silently returns zero products). JSON-serialize so Prisma Decimals/Dates
// arrive as plain values for the client grid (same shape as /api/products).
async function getProductsForCategory(
  categoryId: string,
  sp: ShopSearchParams
): Promise<ProductListResult> {
  try {
    const query = productQuerySchema.parse({
      isActive: "true",
      limit: String(PAGE_SIZE),
      ...(sp.search ? { search: sp.search } : {}),
      ...(sp.minPrice ? { minPrice: sp.minPrice } : {}),
      ...(sp.maxPrice ? { maxPrice: sp.maxPrice } : {}),
      ...(sp.sortBy ? { sortBy: sp.sortBy } : {}),
      ...(sp.sortOrder ? { sortOrder: sp.sortOrder } : {}),
      ...(sp.page ? { page: sp.page } : {}),
    });
    // Parent → its whole subtree, so a parent category lists child products too.
    const categoryIds = await getCategoryAndDescendantIds(categoryId);
    const result = await getProducts({ ...query, categoryIds });
    return JSON.parse(JSON.stringify(result)) as ProductListResult;
  } catch {
    return { products: [], total: 0, page: 1, totalPages: 0 };
  }
}

// Pruned category tree (parent → children, products-bearing only) for the
// grouped filter sidebar.
async function getNonEmptyCategories(): Promise<Category[]> {
  try {
    return (await getNonEmptyCategoryTree()) as unknown as Category[];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}): Promise<Metadata> {
  const { category: slug } = await searchParams;
  if (slug) {
    const category = await getCategoryBySlug(slug);
    if (category) {
      return {
        title: `${category.name} — MyShop`,
        description:
          category.description ?? `Shop ${category.name} products at MyShop.`,
      };
    }
  }
  return {
    title: "Shop All Categories — MyShop",
    description: "Browse every product category available at MyShop.",
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const sp = await searchParams;
  const slug = sp.category;

  // ── Filtered view: a single category — full /products-style layout ────────
  if (slug) {
    const category = await getCategoryBySlug(slug);
    if (category) {
      const [{ products, total, page, totalPages }, sidebarCategories] =
        await Promise.all([
          getProductsForCategory(category.id, sp),
          getNonEmptyCategories(),
        ]);

      const filterState = {
        search: sp.search,
        minPrice: sp.minPrice,
        maxPrice: sp.maxPrice,
        sortBy: sp.sortBy,
        sortOrder: sp.sortOrder,
      };

      return (
        <>
          <PageHeader
            title={category.name}
            breadcrumb={[
              { label: "Home", href: "/" },
              { label: "Shop", href: "/shop" },
              { label: category.name },
            ]}
            icon={Store}
            pill={`${total} ${total === 1 ? "product" : "products"}`}
            subtitle={category.description ?? undefined}
          />
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex gap-8">
              {/* Desktop sidebar */}
              <aside className="hidden w-64 shrink-0 lg:block">
                <ProductFilters
                  categories={sidebarCategories}
                  currentFilters={filterState}
                  categoryParam="category"
                  activeCategoryValue={slug}
                />
              </aside>

              {/* Main column */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <MobileProductFilters
                      categories={sidebarCategories}
                      currentFilters={filterState}
                      categoryParam="category"
                      activeCategoryValue={slug}
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
    // Unknown category slug falls through to the full category listing.
  }

  // ── Default view: all categories ─────────────────────────────────────────
  const categories = await getCategoriesWithCounts();
  const totalProducts = categories.reduce((sum, c) => sum + c.productCount, 0);

  return (
    <>
      <PageHeader
        title="Shop"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Shop" }]}
        icon={Store}
        pill={
          totalProducts > 0
            ? `${totalProducts} ${totalProducts === 1 ? "product" : "products"}`
            : undefined
        }
        subtitle="Explore our full range of products by category."
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-20 text-center">
          <Layers className="size-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            No categories yet
          </p>
          <p className="text-xs text-muted-foreground">
            Check back soon — we&apos;re stocking the shelves.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
            >
              {/* Image or gradient placeholder */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                {category.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={category.image}
                    alt={category.name}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className={`flex size-full items-center justify-center bg-gradient-to-br ${gradientFor(
                      category.id
                    )}`}
                  >
                    <Layers className="size-8 text-white/70" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
                  {category.name}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {category.productCount}{" "}
                  {category.productCount === 1 ? "product" : "products"}
                </p>

                {category.children.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                    {category.children.map((child) => (
                      <li key={child.id} className="truncate">
                        {child.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Link>
          ))}
        </div>
        )}
      </div>
    </>
  );
}
