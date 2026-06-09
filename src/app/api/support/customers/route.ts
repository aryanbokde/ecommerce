import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireRoles, parseQuery } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import { searchCustomers } from "@/server/services/support-customer.service";

const SUPPORT = [ROLES.SUPPORT, ROLES.ADMIN];

const querySchema = z.object({
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/support/customers — search customers by name/email/phone, paginated.
// Returns SAFE fields only (no password, no 2FA secret). Read-only.
export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireRoles(SUPPORT);
  const { search, page, limit } = parseQuery(
    req.nextUrl.searchParams,
    querySchema
  );

  const result = await searchCustomers({ search, page, limit });

  return NextResponse.json({
    success: true,
    message: "Customers fetched",
    data: result,
  });
});
