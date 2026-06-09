import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { AppError, ErrorCode } from "@/lib/api-error";
import { requireUser, parseJsonBody } from "@/lib/api-auth";
import prisma from "@/server/db";

type RouteCtx = { params: Promise<{ id: string }> };

// All optional, no defaults — a PUT only touches the fields it sends.
const updateAddressSchema = z
  .object({
    label: z.string().trim().min(1).max(50),
    fullName: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(3).max(20),
    line1: z.string().trim().min(1).max(255),
    line2: z.string().trim().max(255).nullable(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(1).max(20),
    country: z.string().trim().length(2).toUpperCase(),
    isDefault: z.boolean(),
  })
  .partial();

/** Load an address and confirm it belongs to the user; 404 otherwise. */
async function getOwnedAddress(userId: string, id: string) {
  const address = await prisma.address.findUnique({ where: { id } });
  if (!address || address.userId !== userId) {
    throw new AppError("Address not found", ErrorCode.NOT_FOUND, 404);
  }
  return address;
}

// PUT /api/addresses/[id] — update own address.
export const PUT = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const session = await requireUser();
    const userId = session.user.id;
    const { id } = await params;

    await getOwnedAddress(userId, id);
    const data = await parseJsonBody(req, updateAddressSchema);

    const address =
      data.isDefault === true
        ? await prisma.$transaction(async (tx) => {
            await tx.address.updateMany({
              where: { userId, isDefault: true, NOT: { id } },
              data: { isDefault: false },
            });
            return tx.address.update({ where: { id }, data });
          })
        : await prisma.address.update({ where: { id }, data });

    return NextResponse.json({
      success: true,
      message: "Address updated",
      data: address,
    });
  }
);

// DELETE /api/addresses/[id] — delete own address (blocked if used by an order).
export const DELETE = withErrorHandler(
  async (_req: NextRequest, { params }: RouteCtx) => {
    const session = await requireUser();
    const { id } = await params;

    await getOwnedAddress(session.user.id, id);

    const orderCount = await prisma.order.count({ where: { addressId: id } });
    if (orderCount > 0) {
      throw new AppError(
        "This address is used by existing orders and cannot be deleted",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    await prisma.address.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Address deleted",
      data: { id },
    });
  }
);
