import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireAdmin, parseJsonBody } from "@/lib/api-auth";
import { renderTemplatePreview } from "@/lib/email";

type RouteCtx = { params: Promise<{ key: string }> };

// Optional unsaved overrides from the live editor; empty body → preview the
// currently-saved template.
const previewSchema = z.object({
  subject: z.string().optional(),
  heading: z.string().optional(),
  introText: z.string().optional(),
  ctaLabel: z.string().optional(),
  footerNote: z.string().optional(),
});

// POST /api/admin/email-templates/[key]/preview — render template HTML (admin only).
export const POST = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    await requireAdmin();
    const { key } = await params;
    const overrides = await parseJsonBody(req, previewSchema);

    const html = await renderTemplatePreview(key, overrides);
    return NextResponse.json({ success: true, data: { html } });
  }
);
