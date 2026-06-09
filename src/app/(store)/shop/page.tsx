import Link from "next/link";
import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { ProductGrid } from "@/components/shared/ProductGrid";
import prisma from "@/server/db";
import type { Product } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// A deterministic gradient per category id so cards without an image still feel
// distinct (and stable across renders).
const GRADIENTS = [
  "from-rose-200 to-orange-200",
  "from-sky-200 to-indigo-200",
  "from-emerald-200 to-teal-200",
  "from-violet-200 to-fuchsia-200",
  "from-amber-200 to-yellow-200",
  "from-cyan-200 to-blue-200",
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

    return rows
      .filter((c) => !c.parentId)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: c.image,
        parentId: c.parentId,
        productCount: c._count.products,
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

async function getProductsForCategory(categoryId: string): Promise<Product[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/products?categoryId=${categoryId}&limit=24&isActive=true`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data?.products ?? []) as Product[];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
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
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: slug } = await searchParams;

  // ── Filtered view: a single category's products ──────────────────────────
  if (slug) {
    const category = await getCategoryBySlug(slug);
    if (category) {
      const products = await getProductsForCategory(category.id);
      return (
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-muted-foreground">
            <Link href="/shop" className="hover:text-foreground hover:underline">
              Shop
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{category.name}</span>
          </nav>

          <header className="mb-8">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {category.name}
            </h1>
            {category.description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {category.description}
              </p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {category.productCount}{" "}
              {category.productCount === 1 ? "product" : "products"}
            </p>
          </header>

          <ProductGrid products={products} columns={3} />
        </div>
      );
    }
    // Unknown category slug falls through to the full category listing.
  }

  // ── Default view: all categories ─────────────────────────────────────────
  const categories = await getCategoriesWithCounts();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Shop by Category
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Explore our full range of products by category.
        </p>
      </header>

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
              href={`/products?categoryId=${category.id}`}
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
  );
}
