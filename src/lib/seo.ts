import type { Metadata } from "next";
import { env } from "@/lib/env";

const siteUrl = env.NEXT_PUBLIC_APP_URL;
const siteName = "MyShop";

const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { template: `%s | ${siteName}`, default: siteName },
  description: "Your one-stop ecommerce store",
  keywords: ["ecommerce", "shop", "online store"],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName,
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export function buildMetadata(overrides: Partial<Metadata> = {}): Metadata {
  return { ...baseMetadata, ...overrides };
}

export function buildProductMetadata(product: {
  name: string;
  description: string;
  image: string;
  price: number;
}): Metadata {
  return buildMetadata({
    title: product.name,
    description: product.description,
    openGraph: {
      ...baseMetadata.openGraph,
      type: "website",
      title: product.name,
      description: product.description,
      images: [{ url: product.image, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  });
}

export function buildCategoryMetadata(category: {
  name: string;
  description: string;
}): Metadata {
  return buildMetadata({
    title: category.name,
    description: category.description,
    openGraph: {
      ...baseMetadata.openGraph,
      type: "website",
      title: category.name,
      description: category.description,
    },
  });
}
