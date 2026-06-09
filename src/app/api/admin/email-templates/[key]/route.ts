import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireAdmin, parseJsonBody } from "@/lib/api-auth";
import { logAudit } from "@/server/services/audit-log.service";
import {
  updateTemplate,
  toggleTemplate,
} from "@/server/services/email-template.service";

type RouteCtx = { params: Promise<{ key: string }> };

const updateSchema = z.object({
  subject: z.string().trim().min(1).max(255),
  heading: z.string().trim().max(255).optional(),
  introText: z.string().trim().max(5000).optional(),
  ctaLabel: z.string().trim().max(100).optional(),
  footerNote: z.string().trim().max(2000).optional(),
});

const toggleSchema = z.object({ enabled: z.boolean() });

// PUT /api/admin/email-templates/[key] — edit subject + copy (admin only).
export const PUT = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const session = await requireAdmin();
    const { key } = await params;
    const data = await parseJsonBody(req, updateSchema);

    const updated = await updateTemplate(key, data);

    await logAudit({
      userId: session.user.id,
      action: "email_template_updated",
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      metadata: { templateKey: key, subject: data.subject },
    });

    return NextResponse.json({ success: true, data: updated });
  }
);

// PATCH /api/admin/email-templates/[key] — enable/disable (admin only).
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const session = await requireAdmin();
    const { key } = await params;
    const { enabled } = await parseJsonBody(req, toggleSchema);

    const updated = await toggleTemplate(key, enabled);

    await logAudit({
      userId: session.user.id,
      action: "email_template_toggled",
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      metadata: { templateKey: key, enabled },
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
