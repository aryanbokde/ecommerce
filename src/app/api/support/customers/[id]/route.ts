import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { AppError, ErrorCode } from "@/lib/api-error";
import { requireRoles } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import { getCustomerDetail } from "@/server/services/support-customer.service";

type RouteCtx = { params: Promise<{ id: string }> };

const SUPPORT = [ROLES.SUPPORT, ROLES.ADMIN];

// GET /api/support/customers/[id] — full read-only profile: details, addresses,
// order count, total spent, last 10 orders, review count. SAFE fields only.
// READ-ONLY by design — there is intentionally no PATCH/DELETE here.
export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: RouteCtx) => {
    await requireRoles(SUPPORT);
    const { id } = await params;

    const customer = await getCustomerDetail(id);
    if (!customer) {
      throw new AppError("Customer not found", ErrorCode.NOT_FOUND, 404);
    }

    return NextResponse.json({
      success: true,
      message: "Customer fetched",
      data: customer,
    });
  }
);
