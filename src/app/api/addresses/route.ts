import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireUser, parseJsonBody } from "@/lib/api-auth";
import prisma from "@/server/db";

const createAddressSchema = z.object({
  label: z.string().trim().min(1).max(50).default("Home"),
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(3).max(20),
  line1: z.string().trim().min(1).max(255),
  line2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().length(2).toUpperCase().default("IN"),
  isDefault: z.boolean().default(false),
});

// GET /api/addresses — all addresses for the logged-in user.
export const GET = withErrorHandler(async () => {
  const session = await requireUser();
  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({
    success: true,
    message: "Addresses fetched",
    data: addresses,
  });
});

// POST /api/addresses — create an address (claims default if requested).
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireUser();
  const userId = session.user.id;
  const data = await parseJsonBody(req, createAddressSchema);

  const address = data.isDefault
    ? await prisma.$transaction(async (tx) => {
        // Only one default per user — clear the old one first.
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
        return tx.address.create({ data: { ...data, userId } });
      })
    : await prisma.address.create({ data: { ...data, userId } });

  return NextResponse.json(
    { success: true, message: "Address created", data: address },
    { status: 201 }
  );
});
