"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/shared/ImageUpload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { notifyError, notifySuccess } from "@/lib/notify";

export interface FlatCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  // Decimal serialises to a string over the wire; null = inherit.
  taxRate: number | string | null;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
}

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const categoryFormSchema = z.object({
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
  parentId: z.string(),
  image: z.string().trim(),
  // Tax slab percent: blank = inherit (parent / default); else 0–100.
  taxRate: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (Number(v) >= 0 && Number(v) <= 100),
      "Enter 0–100, or leave blank to inherit"
    ),
  isActive: z.boolean(),
  sortOrder: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0),
      "Whole number ≥ 0"
    ),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Self + all descendants — invalid parents (would create a cycle).
function descendantIds(all: FlatCategory[], rootId: string): Set<string> {
  const childrenOf = new Map<string | null, string[]>();
  for (const c of all) {
    const arr = childrenOf.get(c.parentId) ?? [];
    arr.push(c.id);
    childrenOf.set(c.parentId, arr);
  }
  const out = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop() as string;
    for (const child of childrenOf.get(cur) ?? []) {
      if (!out.has(child)) {
        out.add(child);
        stack.push(child);
      }
    }
  }
  return out;
}

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: FlatCategory;
  categories: FlatCategory[];
  onSaved: () => void;
}

export function CategoryForm({
  open,
  onOpenChange,
  mode,
  initialData,
  categories,
  onSaved,
}: CategoryFormProps) {
  const [slugEdited, setSlugEdited] = useState(mode === "edit");

  const excluded =
    mode === "edit" && initialData
      ? descendantIds(categories, initialData.id)
      : new Set<string>();
  const parentOptions = categories.filter((c) => !excluded.has(c.id));

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      description: initialData?.description ?? "",
      parentId: initialData?.parentId ?? "",
      image: initialData?.image ?? "",
      taxRate: initialData?.taxRate != null ? String(initialData.taxRate) : "",
      isActive: initialData?.isActive ?? true,
      sortOrder:
        initialData != null ? String(initialData.sortOrder) : "0",
    },
  });

  async function onSubmit(values: CategoryFormValues) {
    const sortOrder = values.sortOrder.trim() === "" ? 0 : Number(values.sortOrder);
    const payload: Record<string, unknown> =
      mode === "create"
        ? {
            name: values.name,
            isActive: values.isActive,
            sortOrder,
            ...(values.slug ? { slug: values.slug } : {}),
            ...(values.description ? { description: values.description } : {}),
            ...(values.parentId ? { parentId: values.parentId } : {}),
            ...(values.image ? { image: values.image } : {}),
            ...(values.taxRate.trim() !== ""
              ? { taxRate: Number(values.taxRate) }
              : {}),
          }
        : {
            name: values.name,
            isActive: values.isActive,
            sortOrder,
            ...(values.slug ? { slug: values.slug } : {}),
            description: values.description || null,
            parentId: values.parentId || null,
            image: values.image || null,
            taxRate:
              values.taxRate.trim() === "" ? null : Number(values.taxRate),
          };

    try {
      const res = await fetch(
        mode === "edit"
          ? `/api/categories/${initialData!.id}`
          : "/api/categories",
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
          mode === "edit" ? "Couldn't update category" : "Couldn't create category",
          json?.error
        );
        return;
      }
      notifySuccess(
        mode === "edit" ? "Category updated" : "Category created",
        values.name
      );
      onSaved();
      onOpenChange(false);
    } catch {
      notifyError("Something went wrong", "Please try again.");
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit category" : "Add category"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Electronics"
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
                      placeholder="electronics"
                      {...field}
                      onChange={(e) => {
                        setSlugEdited(true);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Auto-generated from the name; edit to override.
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
                    <Textarea rows={3} placeholder="Optional…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent category</FormLabel>
                  <Select
                    value={field.value || "none"}
                    // items → trigger shows the parent name (not the raw id).
                    items={[
                      { value: "none", label: "None (top level)" },
                      ...parentOptions.map((c) => ({
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
                      <SelectItem value="none">None (top level)</SelectItem>
                      {parentOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image</FormLabel>
                    <ImageUpload
                      value={field.value || null}
                      onChange={(url) =>
                        form.setValue("image", url ?? "", { shouldDirty: true })
                      }
                      folder="categories"
                      shape="square"
                    />
                    <FormControl>
                      <Input
                        className="mt-1"
                        inputMode="url"
                        placeholder="…or paste an image URL"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort order</FormLabel>
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
                        placeholder="Inherit"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Blank = inherit parent / default. 0 = tax-free.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Visible in the storefront navigation.
                    </FormDescription>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {mode === "edit" ? "Save changes" : "Create category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
