import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireAdmin } from "@/lib/api-auth";
import { getAllTemplates } from "@/server/services/email-template.service";
import { getDeliveryStatsByTemplate } from "@/server/services/email-log.service";
import type { EmailTemplate } from "@/generated/prisma";

// GET /api/admin/email-templates — all templates grouped by category, plus
// per-template delivery stats (admin only).
export const GET = withErrorHandler(async () => {
  await requireAdmin();

  const [all, stats] = await Promise.all([
    getAllTemplates(),
    getDeliveryStatsByTemplate().catch(() => ({})),
  ]);
  const grouped: Record<"auth" | "order" | "admin", EmailTemplate[]> = {
    auth: [],
    order: [],
    admin: [],
  };
  for (const t of all) {
    (grouped[t.category as keyof typeof grouped] ??= []).push(t);
  }

  return NextResponse.json({ success: true, data: grouped, stats });
});
