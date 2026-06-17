import "server-only";

import { Prisma } from "@/generated/prisma";
import prisma from "@/server/db";

// ── Error-log service ─────────────────────────────────────────────────────────
// Persists + queries the `error_logs` table. `saveErrorLog` is fire-and-forget
// (called from logError); the admin error-logs page reads via getErrorLogs /
// getErrorStats and resolves entries via resolveErrorLog.

export interface CreateErrorLogInput {
  level?: "error" | "warn" | "info";
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
  userId?: string;
  route?: string;
  method?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorLogFilters {
  level?: "error" | "warn" | "info";
  resolved?: boolean;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export async function saveErrorLog(data: CreateErrorLogInput) {
  return prisma.errorLog.create({
    data: {
      level: data.level ?? "error",
      message: data.message,
      stack: data.stack ?? null,
      code: data.code ?? null,
      statusCode: data.statusCode ?? null,
      userId: data.userId ?? null,
      route: data.route ?? null,
      method: data.method ?? null,
      userAgent: data.userAgent ?? null,
      ipAddress: data.ipAddress ?? null,
      metadata: (data.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
  });
}

export async function getErrorLogs(filters: ErrorLogFilters = {}) {
  const { level, resolved, from, to, page = 1, limit = 20 } = filters;

  const where: Prisma.ErrorLogWhereInput = {
    ...(level ? { level } : {}),
    ...(resolved !== undefined ? { resolved } : {}),
    ...(from || to
      ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.errorLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.errorLog.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function resolveErrorLog(id: string) {
  return prisma.errorLog.update({
    where: { id },
    data: { resolved: true },
  });
}

/** Mark a single error log as seen by an admin (clears it from the new badge). */
export async function markErrorLogSeen(id: string) {
  return prisma.errorLog.update({
    where: { id },
    data: { seenByAdmin: true },
  });
}

export async function deleteErrorLog(id: string) {
  return prisma.errorLog.delete({ where: { id } });
}

/** Bulk-delete by id. Returns the number of rows removed. */
export async function deleteErrorLogs(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const { count } = await prisma.errorLog.deleteMany({
    where: { id: { in: ids } },
  });
  return count;
}

/** Bulk-update resolved state by id. Returns the number of rows updated. */
export async function setErrorLogsResolved(
  ids: string[],
  resolved: boolean
): Promise<number> {
  if (ids.length === 0) return 0;
  const { count } = await prisma.errorLog.updateMany({
    where: { id: { in: ids } },
    data: { resolved },
  });
  return count;
}

/**
 * Delete every log matching a filter (level / resolved). With no filter this
 * clears the whole table. Returns the number of rows removed. Powers the admin
 * "Delete all N matching" action.
 */
export async function deleteErrorLogsByFilter(
  filters: Pick<ErrorLogFilters, "level" | "resolved"> = {}
): Promise<number> {
  const { level, resolved } = filters;
  const where: Prisma.ErrorLogWhereInput = {
    ...(level ? { level } : {}),
    ...(resolved !== undefined ? { resolved } : {}),
  };
  const { count } = await prisma.errorLog.deleteMany({ where });
  return count;
}

export async function getErrorStats() {
  const now = Date.now();
  const since = (ms: number) => new Date(now - ms);
  const DAY = 86_400_000;

  const [total, unresolved, error, warn, info, last24h, last7d, last30d] =
    await Promise.all([
      prisma.errorLog.count(),
      prisma.errorLog.count({ where: { resolved: false } }),
      prisma.errorLog.count({ where: { level: "error" } }),
      prisma.errorLog.count({ where: { level: "warn" } }),
      prisma.errorLog.count({ where: { level: "info" } }),
      prisma.errorLog.count({ where: { createdAt: { gte: since(DAY) } } }),
      prisma.errorLog.count({ where: { createdAt: { gte: since(7 * DAY) } } }),
      prisma.errorLog.count({ where: { createdAt: { gte: since(30 * DAY) } } }),
    ]);

  return {
    total,
    unresolved,
    byLevel: { error, warn, info },
    trends: { last24h, last7d, last30d },
  };
}
