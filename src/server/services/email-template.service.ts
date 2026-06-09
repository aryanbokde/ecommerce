import "server-only";

import type { EmailTemplate } from "@/generated/prisma";
import prisma from "@/server/db";

// ── Email-template service ────────────────────────────────────────────────────
// Admin-editable overrides for the transactional emails. Each row keys to a
// template in src/lib/email.ts (verify · welcome · reset · password_changed ·
// order_confirmed · order_shipped · order_delivered · order_cancelled ·
// role_changed · account_suspended), grouped into three categories.

export type EmailTemplateCategory = "auth" | "order" | "admin";

export type UpdateTemplateInput = Partial<
  Pick<
    EmailTemplate,
    | "name"
    | "subject"
    | "heading"
    | "introText"
    | "ctaLabel"
    | "footerNote"
    | "enabled"
  >
>;

export async function getTemplate(key: string): Promise<EmailTemplate | null> {
  return prisma.emailTemplate.findUnique({ where: { key } });
}

export async function getTemplatesByCategory(category: string) {
  return prisma.emailTemplate.findMany({
    where: { category },
    orderBy: { name: "asc" },
  });
}

export async function getAllTemplates() {
  return prisma.emailTemplate.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function updateTemplate(key: string, data: UpdateTemplateInput) {
  return prisma.emailTemplate.update({ where: { key }, data });
}

export async function toggleTemplate(key: string, enabled: boolean) {
  return prisma.emailTemplate.update({ where: { key }, data: { enabled } });
}

/** Whether an email should be sent. Defaults to true when no row exists. */
export async function isTemplateEnabled(key: string): Promise<boolean> {
  const row = await prisma.emailTemplate.findUnique({
    where: { key },
    select: { enabled: true },
  });
  return row?.enabled ?? true;
}
