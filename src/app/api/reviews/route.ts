import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { AppError, ErrorCode } from "@/lib/api-error";
import {
  requireUser,
  requireStaff,
  parseQuery,
  parseJsonBody,
} from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import prisma from "@/server/db";

const queryBool = z.enum(["true", "false"]).transform((v) => v === "true");

// `productId` present → public, visible-only reviews for that product.
// `productId` omitted → staff moderation list (all reviews, optional filters).
const listQuerySchema = z.object({
  productId: z.string().trim().min(1).optional(),
  isVisible: queryBool.optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createReviewSchema = z.object({
  productId: z.string().trim().min(1, "productId is required"),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(150).optional(),
  body: z.string().trim().max(5_000).optional(),
});

// GET /api/reviews — public product reviews (?productId=...) OR, for staff with
// no productId, the full moderation list (all reviews, filterable/searchable).
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { productId, isVisible, rating, search, page, limit } = parseQuery(
    req.nextUrl.searchParams,
    listQuerySchema
  );
  const skip = (page - 1) * limit;

  // ── Public: visible reviews for one product + rating summary ────────────────
  if (productId) {
    const where = { productId, isVisible: true };
    const [reviews, total, agg] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, image: true } } },
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({ where, _avg: { rating: true } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Reviews fetched",
      data: {
        reviews,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        averageRating:
          agg._avg.rating != null ? Math.round(agg._avg.rating * 10) / 10 : 0,
        ratingCount: total,
      },
    });
  }

  // ── Staff: moderation list across all products ──────────────────────────────
  await requireStaff();

  const where = {
    ...(isVisible !== undefined ? { isVisible } : {}),
    ...(rating !== undefined ? { rating } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { body: { contains: search } },
            { product: { name: { contains: search } } },
          ],
        }
      : {}),
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, images: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    message: "Reviews fetched",
    data: { reviews, total, page, totalPages: Math.ceil(total / limit) },
  });
});

// POST /api/reviews — customer creates a review (one per product, must own it).
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireUser();
  if (session.user.role !== ROLES.CUSTOMER) {
    throw new AppError(
      "Only customers can write reviews",
      ErrorCode.FORBIDDEN,
      403
    );
  }
  const userId = session.user.id;

  const { productId, rating, title, body: text } = await parseJsonBody(
    req,
    createReviewSchema
  );

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    throw new AppError("Product not found", ErrorCode.NOT_FOUND, 404);
  }

  // One review per (user, product).
  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(
      "You have already reviewed this product",
      ErrorCode.VALIDATION_ERROR,
      409
    );
  }

  // Verified-purchase check: must have a non-cancelled order containing it.
  const purchased = await prisma.orderItem.count({
    where: { productId, order: { userId, status: { not: "cancelled" } } },
  });
  if (purchased === 0) {
    throw new AppError(
      "You can only review products you have purchased",
      ErrorCode.FORBIDDEN,
      403
    );
  }

  const review = await prisma.review.create({
    data: { userId, productId, rating, title, body: text },
  });

  return NextResponse.json(
    { success: true, message: "Review created", data: review },
    { status: 201 }
  );
});
