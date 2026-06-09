import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type {
  Product as ProductSchema,
  BreadcrumbList as BreadcrumbListSchema,
  WithContext,
} from "schema-dts";
import { Star } from "lucide-react";
import JsonLd from "@/components/shared/JsonLd";
import { ProductImageGallery } from "@/components/shared/ProductImageGallery";
import { ProductReviews } from "@/components/shared/ProductReviews";
import { ProductBuyBox } from "@/components/shared/ProductBuyBox";
import { ProductGrid } from "@/components/shared/ProductGrid";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import prisma from "@/server/db";
import { getProductBySlug } from "@/server/services/product.service";
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

  // Related products (same category) — fetched over HTTP so the client cards
  // receive plain JSON (Prisma Decimal isn't serializable across the boundary).
  let related: Product[] = [];
  if (product.categoryId) {
    try {
      const res = await fetch(
        `${BASE_URL}/api/products?categoryId=${product.categoryId}&limit=5`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const json = await res.json();
        related = ((json?.data?.products ?? []) as Product[])
          .filter((p) => p.id !== product.id)
          .slice(0, 4);
      }
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd schema={productSchema} />
      <JsonLd schema={breadcrumbSchema} />

      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
          </BreadcrumbItem>
          {product.category && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={<Link href={`/shop?category=${product.category.slug}`} />}
                >
                  {product.category.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Gallery + info */}
      <div className="grid gap-8 lg:grid-cols-2">
        <ProductImageGallery images={images} name={product.name} />

        <div className="flex flex-col gap-4">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {product.name}
          </h1>

          {totalReviews > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "size-4",
                      i < Math.round(avgRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/40"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {avgRating.toFixed(1)} ({totalReviews})
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold text-foreground">
              {formatPrice(price)}
            </span>
            {onSale && (
              <>
                <span className="text-base text-muted-foreground line-through">
                  {formatPrice(compare!)}
                </span>
                <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {savings}% off
                </span>
              </>
            )}
          </div>

          {product.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          <p className={cn("text-sm font-medium", stockLabel.className)}>
            {stockLabel.text}
          </p>

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

          {/* Meta */}
          <dl className="mt-2 flex flex-col gap-1.5 border-t border-border pt-4 text-sm">
            {product.sku && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground">SKU</dt>
                <dd className="text-foreground">{product.sku}</dd>
              </div>
            )}
            {product.category && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Category</dt>
                <dd>
                  <Link
                    href={`/shop?category=${product.category.slug}`}
                    className="text-primary hover:underline"
                  >
                    {product.category.name}
                  </Link>
                </dd>
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Tags</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
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
      <div className="mt-12">
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
  );
}
