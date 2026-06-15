import { z } from "zod";

// ── Product validators ────────────────────────────────────────────────────────
// `createProductSchema` carries the create-time defaults; `updateProductSchema`
// is fully optional with NO defaults (so a PATCH/PUT never silently resets a
// field the caller didn't send). `productQuerySchema` parses URL query strings,
// which arrive as strings — hence the coercions and the `"true"/"false"` booleans.

const name = z.string().trim().min(1, "Name is required").max(255);
const slug = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case");
const positive = z.number().positive();
const nonNegativeInt = z.number().int().min(0);

export const createProductSchema = z.object({
  name,
  // Optional — when omitted the service derives a unique slug from `name`.
  slug: slug.optional(),
  description: z.string().max(20_000).optional(),
  price: positive,
  comparePrice: positive.optional(),
  costPrice: positive.optional(),
  sku: z.string().trim().min(1).max(100).optional(),
  barcode: z.string().trim().min(1).max(100).optional(),
  stock: nonNegativeInt.default(0),
  lowStockAt: nonNegativeInt.default(5),
  weight: positive.optional(),
  // Tax override percent (0–100). null/omitted = inherit the category chain.
  taxRate: z.number().min(0).max(100).nullable().optional(),
  categoryId: z.string().trim().min(1).optional(),
  images: z.array(z.string().trim().min(1)).max(20).optional(),
  tags: z.array(z.string().trim().min(1)).max(50).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

// All fields optional, no defaults applied on update.
export const updateProductSchema = z
  .object({
    name,
    slug,
    description: z.string().max(20_000).nullable(),
    price: positive,
    comparePrice: positive.nullable(),
    costPrice: positive.nullable(),
    sku: z.string().trim().min(1).max(100).nullable(),
    barcode: z.string().trim().min(1).max(100).nullable(),
    stock: nonNegativeInt,
    lowStockAt: nonNegativeInt,
    weight: positive.nullable(),
    taxRate: z.number().min(0).max(100).nullable(),
    categoryId: z.string().trim().min(1).nullable(),
    images: z.array(z.string().trim().min(1)).max(20),
    tags: z.array(z.string().trim().min(1)).max(50),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
  })
  .partial();

// Query params come in as strings; coerce and clamp. Booleans must be the
// literal "true"/"false" (z.coerce.boolean() treats any non-empty string as
// true, which would make `isActive=false` mean true).
const queryBool = z
  .enum(["true", "false"])
  .transform((v) => v === "true");

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  isFeatured: queryBool.optional(),
  isActive: queryBool.optional(),
  sortBy: z
    .enum(["price", "name", "createdAt", "stock", "reviews"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
