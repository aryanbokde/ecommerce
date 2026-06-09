import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireUser, parseJsonBody } from "@/lib/api-auth";
import { AppError, ErrorCode } from "@/lib/api-error";
import prisma from "@/server/db";

// GET /api/users/me/sessions — the current user's active sessions, newest first.
// Each is flagged `current` so the client can hide its own revoke button.
export const GET = withErrorHandler(async () => {
  const session = await requireUser();
  const currentId = session.session?.id;

  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      deviceType: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Sessions fetched",
    data: sessions.map((s) => ({ ...s, current: s.id === currentId })),
  });
});

const revokeSchema = z
  .object({
    sessionId: z.string().trim().min(1).optional(),
    allOthers: z.boolean().optional(),
  })
  .refine((d) => d.sessionId || d.allOthers, {
    message: "Provide a sessionId or allOthers: true",
  });

// DELETE /api/users/me/sessions — revoke one session, or all but the current one.
export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const session = await requireUser();
  const userId = session.user.id;
  const currentId = session.session?.id;
  const { sessionId, allOthers } = await parseJsonBody(req, revokeSchema);

  if (allOthers) {
    const result = await prisma.session.deleteMany({
      where: { userId, NOT: { id: currentId } },
    });
    return NextResponse.json({
      success: true,
      message: "Other sessions revoked",
      data: { revoked: result.count },
    });
  }

  if (sessionId === currentId) {
    throw new AppError(
      "You can't revoke your current session — use log out instead",
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }

  // Scope the delete to the owner so one user can't revoke another's session.
  const result = await prisma.session.deleteMany({
    where: { id: sessionId, userId },
  });
  if (result.count === 0) {
    throw new AppError("Session not found", ErrorCode.NOT_FOUND, 404);
  }

  return NextResponse.json({
    success: true,
    message: "Session revoked",
    data: { id: sessionId },
  });
});
