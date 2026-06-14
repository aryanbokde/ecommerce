import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type {
  Product as ProductSchema,
  BreadcrumbList as BreadcrumbListSchema,
  WithContext,
} from "schema-dts";
import { Star, Truck, RotateCcw, ShieldCheck, Package } from "lucide-react";
import JsonLd from "@/components/shared/JsonLd";
import { ProductImageGallery } from "@/components/shared/ProductImageGallery";
import { ProductReviews } from "@/components/shared/ProductReviews";
import { ProductBuyBox } from "@/components/shared/ProductBuyBox";
import { ProductGrid } from "@/components/shared/ProductGrid";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import prisma from "@/server/db";
import { getProductBySlug, getProducts } from "@/server/services/product.service";
import type { Product } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// De-dupe the DB read between generateMetadata and the page (same request).
const getProduct = cache((slug: string) => getProductBySlug(slug));

function toImages(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((s): s is string => typeof s === "string") : [];
}

function formatPrice(value: string | number): string {
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

// Pre-render the 100 most recent products at build time.
export async function generateStaticParams() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { slug: true },
    });
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product || !product.isActive) return { title: "Product not found" };

  const images = toImages(product.images);
  const description =
    product.description?.slice(0, 160) ?? `Buy ${product.name} at MyShop.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      title: product.name,
      description,
      type: "website",
      url: `${BASE_URL}/products/${slug}`,
      images: images.length ? [images[0]] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  // Inactive products are hidden from the storefront (no detail page, no add).
  if (!product || !product.isActive) notFound();

  const images = toImages(product.images);
  const tags = toImages(product.tags);
  const reviews = product.reviews ?? [];
  const totalReviews = reviews.length;
  const avgRating = totalReviews
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;

  const price = Number(product.price);
  const compare = product.comparePrice != null ? Number(product.comparePrice) : null;
  const onSale = compare != null && compare > price;
  const savings = onSale ? Math.round((1 - price / compare) * 100) : 0;

  // Related products (same category). Call the service directly — a Server
  // Component must never fetch its own API route (self-fetch can deadlock the
  // render). Serialize Prisma Decimals/Dates to plain values for the client cards.
  let related: Product[] = [];
  if (product.categoryId) {
    try {
      const { products: rel } = await getProducts({
        page: 1,
        limit: 5,
        categoryId: product.categoryId,
        isActive: true,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      related = rel
        .filter((p) => p.id !== product.id)
        .slice(0, 4)
        .map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price.toString(),
          comparePrice: p.comparePrice != null ? p.comparePrice.toString() : null,
          images: toImages(p.images),
          stock: p.stock,
          category: p.category
            ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
            : null,
          createdAt: p.createdAt.toISOString(),
          isActive: p.isActive,
        })) as unknown as Product[];
    } catch {
      /* ignore — related is best-effort */
    }
  }

  const stockLabel =
    product.stock > 10
      ? { text: "In stock", className: "text-green-600" }
      : product.stock > 0
        ? { text: `Only ${product.stock} left`, className: "text-amber-600" }
        : { text: "Out of stock", className: "text-red-600" };

  const productSchema: WithContext<ProductSchema> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: images.length ? images : undefined,
    sku: product.sku ?? undefined,
    offers: {
      "@type": "Offer",
      price: price.toFixed(2),
      priceCurrency: "INR",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${BASE_URL}/products/${product.slug}`,
    },
    ...(totalReviews > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            reviewCount: totalReviews,
          },
        }
      : {}),
  };

  // BreadcrumbList structured data mirroring the visible breadcrumb.
  const breadcrumbSchema: WithContext<BreadcrumbListSchema> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      ...(product.category
        ? [
            {
              "@type": "ListItem" as const,
              position: 2,
              name: product.category.name,
              item: `${BASE_URL}/shop?category=${product.category.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: product.category ? 3 : 2,
        name: product.name,
        item: `${BASE_URL}/products/${product.slug}`,
      },
    ],
  };

  return (
    <>
      <JsonLd schema={productSchema} />
      <JsonLd schema={breadcrumbSchema} />

      <PageHeader
        title={product.name}
        breadcrumb={[
          { label: "Home", href: "/" },
          ...(product.category
            ? [
                {
                  label: product.category.name,
                  href: `/shop?category=${product.category.slug}`,
                },
              ]
            : []),
          { label: product.name },
        ]}
        icon={Package}
        pill={product.category?.name}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Gallery + info */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Gallery sticks while the (often taller) info column scrolls. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductImageGallery images={images} name={product.name} />
        </div>

        <div className="flex flex-col">
          {/* Rating → jumps to reviews */}
          {totalReviews > 0 && (
            <a
              href="#reviews"
              className="mt-3 flex w-fit items-center gap-2 text-sm transition-opacity hover:opacity-80"
            >
              <span className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "size-4",
                      i < Math.round(avgRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </span>
              <span className="font-medium text-foreground">
                {avgRating.toFixed(1)}
              </span>
              <span className="text-muted-foreground underline-offset-4 hover:underline">
                {totalReviews} review{totalReviews === 1 ? "" : "s"}
              </span>
            </a>
          )}

          {/* Price */}
          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {formatPrice(price)}
            </span>
            {onSale && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(compare!)}
                </span>
                <span className="rounded-full bg-red-600/10 px-2.5 py-1 text-xs font-semibold text-red-600">
                  Save {savings}%
                </span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Inclusive of all taxes
          </p>

          {/* Stock */}
          <div className="mt-4 flex items-center gap-2">
            <span
              className={cn(
                "inline-block size-2 rounded-full",
                product.stock > 10
                  ? "bg-green-500"
                  : product.stock > 0
                    ? "bg-amber-500"
                    : "bg-red-500"
              )}
            />
            <span className={cn("text-sm font-medium", stockLabel.className)}>
              {stockLabel.text}
            </span>
          </div>

          {product.description && (
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          <div className="mt-6 border-t border-border pt-6">
            <ProductBuyBox
              productId={product.id}
              productName={product.name}
              productSlug={product.slug}
              price={product.price.toString()}
              image={
                Array.isArray(product.images) &&
                typeof product.images[0] === "string"
                  ? product.images[0]
                  : null
              }
              stock={product.stock}
            />
          </div>

          {/* Trust badges */}
          <div className="mt-6 grid grid-cols-3 gap-3 rounded-xl border border-border bg-muted/30 p-4">
            {[
              { icon: Truck, title: "Free shipping", sub: "Orders over ₹999" },
              { icon: RotateCcw, title: "Easy returns", sub: "7-day window" },
              { icon: ShieldCheck, title: "Secure", sub: "Safe checkout" },
            ].map((b) => (
              <div key={b.title} className="flex flex-col items-center gap-1.5 text-center">
                <b.icon className="size-5 text-brand-blue" />
                <span className="text-xs font-semibold text-foreground">
                  {b.title}
                </span>
                <span className="text-[11px] leading-tight text-muted-foreground">
                  {b.sub}
                </span>
              </div>
            ))}
          </div>

          {/* Meta */}
          <dl className="mt-6 flex flex-col gap-2 border-t border-border pt-5 text-sm">
            {product.sku && (
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-muted-foreground">SKU</dt>
                <dd className="font-medium text-foreground tabular-nums">
                  {product.sku}
                </dd>
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-muted-foreground">Tags</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Reviews */}
      <div id="reviews" className="mt-16 scroll-mt-24 border-t border-border pt-10">
        <ProductReviews
          productId={product.id}
          avgRating={avgRating}
          totalReviews={totalReviews}
        />
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-12 border-t border-border pt-10">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Related Products
          </h2>
          <div className="mt-6">
            <ProductGrid products={related} columns={4} />
          </div>
        </div>
      )}
      </div>
    </>
  );
}
