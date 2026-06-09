import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/admin/DashboardShell";
import {
  ProductForm,
  type ProductFormInitialData,
} from "@/components/admin/ProductForm";
import { getProductById } from "@/server/services/product.service";

export const metadata: Metadata = { title: "Edit Product" };

interface PageProps {
  params: Promise<{ id: string }>;
}

// Shop-manager scoped product editor. The (shop-manager) layout already enforces
// requireShopManager(); the form runs in edit mode with the delete/"Danger zone"
// hidden (managers can't delete — the API DELETE is admin-only too) and returns
// to the manager catalog after save/cancel.
export default async function ManagerEditProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  // Decimals/Json aren't serializable across the RSC boundary → plain values.
  const images = Array.isArray(product.images)
    ? (product.images as string[])
    : [];
  const tags = Array.isArray(product.tags) ? (product.tags as string[]) : [];

  const initialData: ProductFormInitialData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? null,
    price: Number(product.price),
    comparePrice: product.comparePrice != null ? Number(product.comparePrice) : null,
    costPrice: product.costPrice != null ? Number(product.costPrice) : null,
    sku: product.sku ?? null,
    barcode: product.barcode ?? null,
    stock: product.stock,
    lowStockAt: product.lowStockAt,
    categoryId: product.categoryId ?? null,
    images,
    tags,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
  };

  return (
    <DashboardShell title="Edit Product" description={product.name}>
      <ProductForm
        mode="edit"
        initialData={initialData}
        basePath="/shop-manager/products"
        hideDangerZone
      />
    </DashboardShell>
  );
}
