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

export interface TemplateDeliveryStat {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
  lastSentAt: string | null;
}

/**
 * Per-template delivery rollup for the email-templates admin page: how many
 * sends succeeded / failed / were skipped, plus when each last went out.
 */
export async function getDeliveryStatsByTemplate(): Promise<
  Record<string, TemplateDeliveryStat>
> {
  const [byStatus, lastSent] = await Promise.all([
    prisma.emailLog.groupBy({
      by: ["templateKey", "status"],
      _count: { _all: true },
    }),
    prisma.emailLog.groupBy({
      by: ["templateKey"],
      where: { status: "sent" },
      _max: { createdAt: true },
    }),
  ]);

  const map: Record<string, TemplateDeliveryStat> = {};
  const ensure = (k: string) =>
    (map[k] ??= { sent: 0, failed: 0, skipped: 0, total: 0, lastSentAt: null });

  for (const row of byStatus) {
    const s = ensure(row.templateKey);
    const n = row._count._all;
    s.total += n;
    if (row.status === "sent") s.sent += n;
    else if (row.status === "failed") s.failed += n;
    else if (row.status === "skipped") s.skipped += n;
  }
  for (const row of lastSent) {
    ensure(row.templateKey).lastSentAt = row._max.createdAt
      ? row._max.createdAt.toISOString()
      : null;
  }
  return map;
}
