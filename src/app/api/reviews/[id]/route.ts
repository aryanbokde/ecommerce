import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { AppError, ErrorCode } from "@/lib/api-error";
import { requireUser, requireStaff, parseJsonBody } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import prisma from "@/server/db";

type RouteCtx = { params: Promise<{ id: string }> };

// Staff can toggle visibility and/or mark a review as seen. At least one field
// must be present.
const updateReviewSchema = z
  .object({
    isVisible: z.boolean().optional(),
    seen: z.boolean().optional(),
  })
  .refine((d) => d.isVisible !== undefined || d.seen !== undefined, {
    message: "Provide isVisible and/or seen",
  });

// PATCH /api/reviews/[id] — staff moderation: show/hide and/or mark seen.
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    await requireStaff();
    const { id } = await params;
    const { isVisible, seen } = await parseJsonBody(req, updateReviewSchema);

    const existing = await prisma.review.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError("Review not found", ErrorCode.NOT_FOUND, 404);
    }

    const review = await prisma.review.update({
      where: { id },
      data: {
        ...(isVisible !== undefined ? { isVisible } : {}),
        ...(seen !== undefined ? { seenByAdmin: seen } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Review updated",
      data: review,
    });
  }
);

// DELETE /api/reviews/[id] — author deletes own; admin deletes any.
export const DELETE = withErrorHandler(
  async (_req: NextRequest, { params }: RouteCtx) => {
    const session = await requireUser();
    const { id } = await params;

    const review = await prisma.review.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!review) {
      throw new AppError("Review not found", ErrorCode.NOT_FOUND, 404);
    }

    const isAuthor = review.userId === session.user.id;
    const isAdmin = session.user.role === ROLES.ADMIN;
    if (!isAuthor && !isAdmin) {
      throw new AppError(
        "You do not have permission to delete this review",
        ErrorCode.FORBIDDEN,
        403
      );
    }

    await prisma.review.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Review deleted",
      data: { id },
    });
  }
);
