"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X, Trash2 } from "lucide-react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductImageUploader } from "@/components/admin/ProductImageUploader";
import { notifyError, notifySuccess } from "@/lib/notify";

// ── Form schema ───────────────────────────────────────────────────────────────
// Numeric fields are kept as strings (what <input> yields) and converted on
// submit, which keeps the RHF value types clean and avoids coercion surprises.
const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const requiredMoney = z
  .string()
  .trim()
  .min(1, "Required")
  .refine((v) => Number(v) > 0, "Must be greater than 0");
const optionalMoney = z
  .string()
  .trim()
  .refine((v) => v === "" || Number(v) > 0, "Must be greater than 0");
const nonNegInt = z
  .string()
  .trim()
  .min(1, "Required")
  .refine(
    (v) => Number.isInteger(Number(v)) && Number(v) >= 0,
    "Enter a whole number >= 0"
  );
// Tax override percent: blank = inherit; otherwise 0–100.
const optionalPercent = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (Number(v) >= 0 && Number(v) <= 100),
    "Enter 0–100, or leave blank to inherit"
  );

const productFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  slug: z
    .string()
    .trim()
    .max(255)
    .refine(
      (v) => v === "" || slugRe.test(v),
      "Lowercase letters, numbers and hyphens only"
    ),
  description: z.string().max(20_000),
  price: requiredMoney,
  comparePrice: optionalMoney,
  costPrice: optionalMoney,
  sku: z.string().trim().max(100),
  barcode: z.string().trim().max(100),
  stock: nonNegInt,
  lowStockAt: nonNegInt,
  taxRate: optionalPercent,
  categoryId: z.string(),
  tags: z.array(z.string()),
  images: z.array(z.string()),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export interface ProductFormInitialData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  costPrice: number | null;
  sku: string | null;
  barcode: string | null;
  stock: number;
  lowStockAt: number;
  taxRate: number | null;
  categoryId: string | null;
  images: string[];
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
  depth: number;
}

interface CategoryNode {
  id: string;
  name: string;
  children?: CategoryNode[];
}

function flattenCategories(nodes: CategoryNode[], depth = 0): CategoryOption[] {
  return nodes.flatMap((n) => [
    { id: n.id, name: n.name, depth },
    ...flattenCategories(n.children ?? [], depth + 1),
  ]);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

interface ProductFormProps {
  mode: "create" | "edit";
  initialData?: ProductFormInitialData;
  /** Where to return after save/cancel/delete. Defaults to the admin list. */
  basePath?: string;
  /** Hide the delete/"Danger zone" card (shop managers can't delete). */
  hideDangerZone?: boolean;
}

export function ProductForm({
  mode,
  initialData,
  basePath = "/dashboard/products",
  hideDangerZone = false,
}: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!initialData) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${initialData.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't delete product", json?.error);
        return;
      }
      notifySuccess("Product archived", initialData.name);
      setDeleteOpen(false);
      router.push(basePath);
      router.refresh();
    } catch {
      notifyError("Something went wrong", "Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const showDangerZone = mode === "edit" && !hideDangerZone && initialData != null;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      description: initialData?.description ?? "",
      price: initialData?.price != null ? String(initialData.price) : "",
      comparePrice:
        initialData?.comparePrice != null
          ? String(initialData.comparePrice)
          : "",
      costPrice:
        initialData?.costPrice != null ? String(initialData.costPrice) : "",
      sku: initialData?.sku ?? "",
      barcode: initialData?.barcode ?? "",
      stock: initialData != null ? String(initialData.stock) : "0",
      lowStockAt: initialData != null ? String(initialData.lowStockAt) : "5",
      taxRate: initialData?.taxRate != null ? String(initialData.taxRate) : "",
      categoryId: initialData?.categoryId ?? "",
      tags: initialData?.tags ?? [],
      images: initialData?.images ?? [],
      isActive: initialData?.isActive ?? true,
      isFeatured: initialData?.isFeatured ?? false,
    },
  });

  // Load category options for the select.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        if (!cancelled) setCategories(flattenCategories(j.data ?? []));
      })
      .catch(() => {
        /* non-fatal: category select just stays empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(values: ProductFormValues) {
    // Create rejects nulls (optionals omitted); update accepts null to clear.
    const base = {
      name: values.name,
      price: num(values.price),
      stock: Number(values.stock),
      lowStockAt: Number(values.lowStockAt),
      isActive: values.isActive,
      isFeatured: values.isFeatured,
    };

    const payload: Record<string, unknown> =
      mode === "create"
        ? {
            ...base,
            ...(values.slug ? { slug: values.slug } : {}),
            ...(values.description ? { description: values.description } : {}),
            ...(num(values.comparePrice) != null
              ? { comparePrice: num(values.comparePrice) }
              : {}),
            ...(num(values.costPrice) != null
              ? { costPrice: num(values.costPrice) }
              : {}),
            ...(num(values.taxRate) != null
              ? { taxRate: num(values.taxRate) }
              : {}),
            ...(values.sku ? { sku: values.sku } : {}),
            ...(values.barcode ? { barcode: values.barcode } : {}),
            ...(values.categoryId ? { categoryId: values.categoryId } : {}),
            ...(values.images.length ? { images: values.images } : {}),
            ...(values.tags.length ? { tags: values.tags } : {}),
          }
        : {
            ...base,
            ...(values.slug ? { slug: values.slug } : {}),
            description: values.description || null,
            comparePrice: num(values.comparePrice) ?? null,
            costPrice: num(values.costPrice) ?? null,
            taxRate: num(values.taxRate) ?? null,
            sku: values.sku || null,
            barcode: values.barcode || null,
            categoryId: values.categoryId || null,
            images: values.images,
            tags: values.tags,
          };

    try {
      const res = await fetch(
        mode === "edit"
          ? `/api/products/${initialData!.id}`
          : "/api/products",
        {
          method: mode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError(
          mode === "edit" ? "Couldn't update product" : "Couldn't create product",
          json?.error
        );
        return;
      }
      notifySuccess(
        mode === "edit" ? "Product updated" : "Product created",
        values.name
      );
      // Mark pristine so the unsaved-changes guard doesn't fire on navigate.
      form.reset(values);
      router.push(basePath);
      router.refresh();
    } catch {
      notifyError("Something went wrong", "Please try again.");
    }
  }

  const isSubmitting = form.formState.isSubmitting;
  const isDirty = form.formState.isDirty;

  // Warn before leaving with unsaved edits (browser/tab close + reload).
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Live merchandising hints under the pricing card.
  const [priceStr, costStr, compareStr, slugValue] = useWatch({
    control: form.control,
    name: ["price", "costPrice", "comparePrice", "slug"],
  });
  const priceN = Number(priceStr);
  const costN = Number(costStr);
  const compareN = Number(compareStr);
  const margin =
    priceN > 0 && costN > 0 && costN < priceN
      ? ((priceN - costN) / priceN) * 100
      : null;
  const discount =
    compareN > 0 && priceN > 0 && compareN > priceN
      ? ((compareN - priceN) / compareN) * 100
      : null;
  const compareInvalid = compareN > 0 && priceN > 0 && compareN <= priceN;

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6 pb-20"
      >
        <div className="grid items-start gap-6 lg:grid-cols-3">
          {/* ── Main column ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Basic */}
            <Card>
              <CardHeader>
                <CardTitle>Basic</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Wireless Headphones"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (!slugEdited) {
                              form.setValue("slug", slugify(e.target.value), {
                                shouldValidate: true,
                              });
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="wireless-headphones"
                          {...field}
                          onChange={(e) => {
                            setSlugEdited(true);
                            field.onChange(e);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        {slugValue ? (
                          <span className="font-mono text-foreground/70">
                            {origin}/products/{slugValue}
                          </span>
                        ) : (
                          "Auto-generated from the name; edit to override."
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={5}
                          placeholder="Describe the product..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="comparePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compare-at (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Live margin / discount / validation hints */}
                {(margin != null || discount != null || compareInvalid) && (
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
                    {margin != null && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        Margin {margin.toFixed(0)}%
                      </span>
                    )}
                    {discount != null && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                        {discount.toFixed(0)}% off compare-at
                      </span>
                    )}
                    {compareInvalid && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        Compare-at should be higher than price
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="SKU-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input placeholder="0123456789012" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lowStockAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Low-stock threshold</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Inherit category"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Blank = inherit the category&apos;s rate (or the store
                        default). 0 = tax-free.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle>Images</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem>
                      <ProductImageUploader
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Visible and purchasable in the store.
                        </FormDescription>
                      </div>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Featured</FormLabel>
                        <FormDescription>
                          Highlighted on the storefront.
                        </FormDescription>
                      </div>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Organization */}
            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value || "none"}
                        // items: trigger shows the category name, not the raw id.
                        items={[
                          { value: "none", label: "No category" },
                          ...categories.map((c) => ({
                            value: c.id,
                            label: c.name,
                          })),
                        ]}
                        onValueChange={(v) =>
                          field.onChange(v === "none" ? "" : (v ?? ""))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {"  ".repeat(c.depth)}
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <TagsInput value={field.value} onChange={field.onChange} />
                      <FormDescription>
                        Press Enter or comma to add a tag.
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Danger zone (edit + admin only) */}
        {showDangerZone && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive">Danger zone</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Archiving deactivates this product and hides it from the store.
                Order history is preserved.
              </p>
              <Button
                type="button"
                variant="destructive"
                className="shrink-0"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Archive product
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Sticky save bar */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-(--breakpoint-2xl) items-center justify-end gap-2 px-4 py-3 sm:px-6">
            {isDirty && (
              <span className="mr-auto text-sm text-muted-foreground">
                Unsaved changes
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(basePath)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {mode === "edit" ? "Save changes" : "Create product"}
            </Button>
          </div>
        </div>
      </form>

      {/* Delete confirmation */}
      {showDangerZone && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive product?</DialogTitle>
              <DialogDescription>
                “{initialData!.name}” will be deactivated and hidden from the
                store. Existing order history is preserved.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={deleting}
              >
                {deleting && <Loader2 className="size-4 animate-spin" />}
                Archive
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Form>
  );
}

// Small chip-style multi-input for tags.
function TagsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const tag = raw.trim();
    if (!tag || value.includes(tag)) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent p-1.5">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={value.length === 0 ? "Add tags..." : ""}
        className="h-6 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
