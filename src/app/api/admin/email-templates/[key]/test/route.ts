import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireAdmin } from "@/lib/api-auth";
import { sendTemplateTest } from "@/lib/email";

type RouteCtx = { params: Promise<{ key: string }> };

// POST /api/admin/email-templates/[key]/test — send a real test email of this
// template to the signed-in admin's own address (admin only). Bypasses the
// enabled gate so a disabled template can still be previewed in an inbox.
export const POST = withErrorHandler(
  async (_req: NextRequest, { params }: RouteCtx) => {
    const session = await requireAdmin();
    const { key } = await params;

    const result = await sendTemplateTest(key, session.user.email);

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${session.user.email}`,
      data: result,
    });
  }
);
