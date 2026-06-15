import { z } from "zod";

// ── Category validators ───────────────────────────────────────────────────────
// `createCategorySchema` keeps create-time defaults; `updateCategorySchema` is
// fully optional with no defaults (and nullable where a field can be cleared,
// e.g. detaching a parent by sending parentId: null).

const name = z.string().trim().min(1, "Name is required").max(255);
const slug = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case");

// Tax slab percent (0–100). null = inherit from the parent category / default.
const taxRate = z.number().min(0).max(100).nullable();

export const createCategorySchema = z.object({
  name,
  slug: slug.optional(),
  parentId: z.string().trim().min(1).optional(),
  description: z.string().max(20_000).optional(),
  image: z.string().trim().min(1).optional(),
  taxRate: taxRate.optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCategorySchema = z
  .object({
    name,
    slug,
    parentId: z.string().trim().min(1).nullable(),
    description: z.string().max(20_000).nullable(),
    image: z.string().trim().min(1).nullable(),
    taxRate,
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0),
  })
  .partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
