import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireStaff } from "@/lib/api-auth";
import { markCodPaid } from "@/server/services/order.service";

type RouteCtx = { params: Promise<{ id: string }> };

// POST /api/orders/[id]/mark-paid — staff record COD cash collected (unpaid → paid).
export const POST = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const session = await requireStaff();
    const { id } = await params;
    const order = await markCodPaid(id, {
      userId: session.user.id,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({
      success: true,
      message: "Payment marked as collected",
      data: order,
    });
  }
);
