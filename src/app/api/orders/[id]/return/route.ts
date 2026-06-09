import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireUser, requireRoles, parseJsonBody } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import { requestReturn, resolveReturn } from "@/server/services/return.service";

type RouteCtx = { params: Promise<{ id: string }> };

const createSchema = z.object({
  reason: z.string().trim().min(5, "Tell us why (min 5 chars)").max(2000),
});

const resolveSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNote: z.string().trim().max(2000).optional(),
  restock: z.boolean().optional(),
});

// POST /api/orders/[id]/return — customer requests a return on a delivered order.
export const POST = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const session = await requireUser();
    const { id } = await params;
    const { reason } = await parseJsonBody(req, createSchema);
    const ret = await requestReturn(id, session.user.id, reason);
    return NextResponse.json(
      { success: true, message: "Return requested", data: ret },
      { status: 201 }
    );
  }
);

// PATCH /api/orders/[id]/return — admin approves or rejects the return.
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const session = await requireRoles([ROLES.ADMIN]);
    const { id } = await params;
    const { action, adminNote, restock } = await parseJsonBody(req, resolveSchema);
    const ret = await resolveReturn(
      id,
      action,
      { adminNote, restock },
      {
        userId: session.user.id,
        ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
      }
    );
    return NextResponse.json({
      success: true,
      message: action === "approve" ? "Return approved" : "Return rejected",
      data: ret,
    });
  }
);
