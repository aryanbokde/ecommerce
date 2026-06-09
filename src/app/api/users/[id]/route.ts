import { type NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { AppError, ErrorCode } from "@/lib/api-error";
import { requireAdmin, parseJsonBody } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import { logAudit } from "@/server/services/audit-log.service";
import {
  sendEmail,
  roleChangedEmail,
  accountBannedEmail,
} from "@/lib/email";
import prisma from "@/server/db";
import { Prisma } from "@/generated/prisma";

type RouteCtx = { params: Promise<{ id: string }> };

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

const updateUserSchema = z
  .object({
    role: z.enum([
      ROLES.CUSTOMER,
      ROLES.SHOP_MANAGER,
      ROLES.SUPPORT,
      ROLES.ADMIN,
    ]),
    isActive: z.boolean(),
    // Optional reason recorded when deactivating (isActive: false). Ignored
    // when reactivating.
    banReason: z.string().trim().max(2_000).optional(),
  })
  .partial()
  .refine((d) => d.role !== undefined || d.isActive !== undefined, {
    message: "Provide at least one of: role, isActive",
  });

// GET /api/users/[id] — admin, single user + recent audit-log summary.
export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: RouteCtx) => {
    await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
    if (!user) {
      throw new AppError("User not found", ErrorCode.NOT_FOUND, 404);
    }

    const [recent, totalAuditLogs, byAction] = await Promise.all([
      prisma.auditLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.auditLog.count({ where: { userId: id } }),
      prisma.auditLog.groupBy({
        by: ["action"],
        where: { userId: id },
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "User fetched",
      data: {
        ...user,
        audit: {
          total: totalAuditLogs,
          recent,
          byAction: byAction.map((r) => ({
            action: r.action,
            count: r._count._all,
          })),
        },
      },
    });
  }
);

// PATCH /api/users/[id] — admin, update role and/or isActive.
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const session = await requireAdmin();
    const { id } = await params;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    });
    if (!existing) {
      throw new AppError("User not found", ErrorCode.NOT_FOUND, 404);
    }

    const data = await parseJsonBody(req, updateUserSchema);

    // Guard against self-lockout: an admin can't demote or deactivate themselves.
    if (id === session.user.id) {
      if (data.role !== undefined && data.role !== existing.role) {
        throw new AppError(
          "You cannot change your own role",
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }
      if (data.isActive === false) {
        throw new AppError(
          "You cannot deactivate your own account",
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }
    }

    // Build an explicit update so deactivation also syncs better-auth's ban
    // fields (banned / banReason) — otherwise better-auth itself never knows the
    // account is suspended, and the admin-entered reason is silently dropped.
    const updateData: Prisma.UserUpdateInput = {};
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
      if (data.isActive === false) {
        updateData.banned = true;
        updateData.banReason = data.banReason?.trim() || null;
        updateData.banExpires = null; // permanent until explicitly unbanned
      } else {
        updateData.banned = false;
        updateData.banReason = null;
        updateData.banExpires = null;
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: safeUserSelect,
    });

    if (data.role !== undefined && data.role !== existing.role) {
      await logAudit({
        userId: id,
        action: "role_changed",
        ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
        metadata: {
          from: existing.role,
          to: data.role,
          changedBy: session.user.id,
        },
      });
      // Notify the affected user of their new access level.
      after(() =>
        sendEmail({
          ...roleChangedEmail(user.name, { role: data.role! }),
          to: user.email,
        })
      );
    }

    // Notify the user when their account is suspended (isActive → false).
    if (data.isActive === false && existing.isActive) {
      await logAudit({
        userId: id,
        action: "account_banned",
        ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
        metadata: {
          suspendedBy: session.user.id,
          ...(data.banReason?.trim() ? { reason: data.banReason.trim() } : {}),
        },
      });
      after(() =>
        sendEmail({ ...accountBannedEmail(user.name), to: user.email })
      );
    }

    return NextResponse.json({
      success: true,
      message: "User updated",
      data: user,
    });
  }
);

// DELETE /api/users/[id] — admin, soft delete (isActive: false).
export const DELETE = withErrorHandler(
  async (_req: NextRequest, { params }: RouteCtx) => {
    const session = await requireAdmin();
    const { id } = await params;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError("User not found", ErrorCode.NOT_FOUND, 404);
    }
    if (id === session.user.id) {
      throw new AppError(
        "You cannot deactivate your own account",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: safeUserSelect,
    });

    return NextResponse.json({
      success: true,
      message: "User deactivated",
      data: user,
    });
  }
);
