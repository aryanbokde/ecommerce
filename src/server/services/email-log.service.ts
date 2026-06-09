import "server-only";

import type { Prisma } from "@/generated/prisma";
import prisma from "@/server/db";

// ── Email-log service ─────────────────────────────────────────────────────────
// Records every send attempt (sent · skipped · failed) so the admin can audit
// what went out — and confirm that disabled templates are being skipped.

export type EmailStatus = "sent" | "skipped" | "failed";

export interface LogEmailInput {
  templateKey: string;
  recipient: string;
  subject: string;
  status: EmailStatus;
  error?: string;
}

/** Persist one email-log row. Never throws — logging must not break a send. */
export async function logEmail(data: LogEmailInput): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        templateKey: data.templateKey,
        recipient: data.recipient,
        subject: data.subject,
        status: data.status,
        error: data.error ?? null,
      },
    });
  } catch {
    /* swallow — never let logging failure affect the caller */
  }
}

export interface EmailLogFilters {
  templateKey?: string;
  status?: EmailStatus;
  page?: number;
  limit?: number;
}

export async function getEmailLogs(filters: EmailLogFilters = {}) {
  const { templateKey, status, page = 1, limit = 20 } = filters;

  const where: Prisma.EmailLogWhereInput = {
    ...(templateKey ? { templateKey } : {}),
    ...(status ? { status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.emailLog.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
