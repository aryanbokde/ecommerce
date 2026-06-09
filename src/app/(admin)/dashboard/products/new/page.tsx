import type { Metadata } from "next";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = { title: "Add Product" };

export default function NewProductPage() {
  return (
    <DashboardShell title="Add Product" description="Create a new product">
      <ProductForm mode="create" />
    </DashboardShell>
  );
}
