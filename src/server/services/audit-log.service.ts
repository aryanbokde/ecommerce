import "server-only";

import { Prisma } from "@/generated/prisma";
import prisma from "@/server/db";
import logger from "@/lib/logger";

// ── Audit-log service ─────────────────────────────────────────────────────────
// Records every meaningful auth/account action to the `audit_logs` table. Audit
// logging must NEVER break the main flow, so `logAudit` swallows its own errors.

export type AuditAction =
  | "login_success"
  | "login_failed"
  | "logout"
  | "register"
  | "email_verified"
  | "password_reset_requested"
  | "password_changed"
  | "2fa_enabled"
  | "2fa_disabled"
  | "2fa_failed"
  | "session_revoked"
  | "account_banned"
  | "account_unbanned"
  | "role_changed"
  | "profile_updated"
  | "oauth_connected"
  | "oauth_disconnected"
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "category_created"
  | "category_updated"
  | "category_deleted"
  | "order_placed"
  | "order_status_changed"
  | "order_fulfilled"
  | "order_note_added"
  | "order_cancelled"
  | "order_refunded"
  | "order_payment_collected"
  | "return_requested"
  | "return_approved"
  | "return_rejected"
  | "order_confirmation_resent"
  | "payment_success"
  | "payment_failed"
  | "email_template_updated"
  | "email_template_toggled";

export type AuditStatus = "success" | "failed" | "blocked";

export interface CreateAuditInput {
  userId?: string;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  status?: AuditStatus;
}

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  status?: AuditStatus;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

/**
 * Persist a single audit entry. Fire-and-forget friendly: never throws — on
 * failure it logs the error via Winston and resolves anyway so the caller's
 * main flow is never interrupted by audit failures.
 */
export async function logAudit(data: CreateAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId ?? null,
        action: data.action,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        metadata: (data.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        status: data.status ?? "success",
      },
    });
  } catch (error) {
    logger.error("Failed to write audit log", {
      name: "AuditLogError",
      action: data.action,
      userId: data.userId,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Paginated audit-log query, newest first. Defaults: page 1, limit 20.
 */
export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const { userId, action, status, from, to, page = 1, limit = 20 } = filters;

  const where: Prisma.AuditLogWhereInput = {
    ...(userId ? { userId } : {}),
    ...(action ? { action } : {}),
    ...(status ? { status } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Summary counts for the audit-log dashboard: total entries, success/failed/
 * blocked breakdown, and a 24h/7d trend.
 */
export async function getAuditStats() {
  const now = Date.now();
  const since = (ms: number) => new Date(now - ms);
  const DAY = 86_400_000;

  const [total, success, failed, blocked, last24h, last7d] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { status: "success" } }),
    prisma.auditLog.count({ where: { status: "failed" } }),
    prisma.auditLog.count({ where: { status: "blocked" } }),
    prisma.auditLog.count({ where: { createdAt: { gte: since(DAY) } } }),
    prisma.auditLog.count({ where: { createdAt: { gte: since(7 * DAY) } } }),
  ]);

  return {
    total,
    byStatus: { success, failed, blocked },
    trends: { last24h, last7d },
  };
}

/**
 * Count failed login attempts for an email identifier within the last N
 * minutes. Used to rate-limit login attempts. Matches on the JSON `email`
 * key stored in `metadata`.
 */
export async function getRecentFailedLogins(
  email: string,
  minutes: number
): Promise<number> {
  const since = new Date(Date.now() - minutes * 60 * 1000);

  return prisma.auditLog.count({
    where: {
      action: "login_failed",
      createdAt: { gte: since },
      metadata: {
        path: "$.email",
        equals: email,
      },
    },
  });
}
