import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireAdmin, parseQuery } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import prisma from "@/server/db";

// Safe projection — never expose anything sensitive. (The password hash lives on
// Account, not User, so it can't leak here; we still select fields explicitly.)
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  role: true,
  isActive: true,
  twoFactorEnabled: true,
  banned: true,
  banReason: true,
  banExpires: true,
  createdAt: true,
  updatedAt: true,
} as const;

const queryBool = z.enum(["true", "false"]).transform((v) => v === "true");

const userQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  role: z
    .enum([ROLES.CUSTOMER, ROLES.SHOP_MANAGER, ROLES.SUPPORT, ROLES.ADMIN])
    .optional(),
  isActive: queryBool.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/users — admin, paginated/filterable user list (no sensitive fields).
export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin();

  const { search, role, isActive, page, limit } = parseQuery(
    req.nextUrl.searchParams,
    userQuerySchema
  );

  const where = {
    ...(role ? { role } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: safeUserSelect,
      // `id` tiebreaker → stable pagination when createdAt ties (else rows can
      // skip/duplicate across pages).
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    message: "Users fetched",
    data: { users, total, page, totalPages: Math.ceil(total / limit) },
  });
});
