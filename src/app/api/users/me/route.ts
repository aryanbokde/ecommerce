import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireUser, parseJsonBody } from "@/lib/api-auth";
import prisma from "@/server/db";
import { logAudit } from "@/server/services/audit-log.service";

// Fields a user is allowed to read/update on their OWN profile.
const meSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  image: true,
  role: true,
  emailVerified: true,
  twoFactorEnabled: true,
  createdAt: true,
} as const;

// Only name / phone / image are self-editable — role and email are protected.
const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().max(20).nullable(),
    image: z.string().trim().url("Enter a valid image URL").max(2048).nullable(),
  })
  .partial();

// GET /api/users/me — the current user's own profile.
export const GET = withErrorHandler(async () => {
  const session = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: meSelect,
  });
  return NextResponse.json({
    success: true,
    message: "Profile fetched",
    data: user,
  });
});

// PATCH /api/users/me — update own name / phone / image only.
export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const session = await requireUser();
  const data = await parseJsonBody(req, updateMeSchema);

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: meSelect,
  });

  await logAudit({
    userId: session.user.id,
    action: "profile_updated",
    metadata: { fields: Object.keys(data) },
  });

  return NextResponse.json({
    success: true,
    message: "Profile updated",
    data: user,
  });
});
