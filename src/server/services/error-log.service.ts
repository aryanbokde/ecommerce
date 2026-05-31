import "server-only";
import type { Prisma } from "@/generated/prisma";
import db from "@/lib/db";

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
  return db.errorLog.create({
    data: {
      level: data.level ?? "error",
      message: data.message,
      stack: data.stack,
      code: data.code,
      statusCode: data.statusCode,
      userId: data.userId,
      route: data.route,
      method: data.method,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      metadata: data.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getErrorLogs(filters: ErrorLogFilters = {}) {
  const { level, resolved, from, to, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where = {
    ...(level !== undefined && { level }),
    ...(resolved !== undefined && { resolved }),
    ...(from !== undefined || to !== undefined
      ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.errorLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.errorLog.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function resolveErrorLog(id: string) {
  return db.errorLog.update({
    where: { id },
    data: { resolved: true },
  });
}

export async function getErrorStats() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [total, unresolved, byLevel, last24hCount, last7dCount, last30dCount] =
    await Promise.all([
      db.errorLog.count(),
      db.errorLog.count({ where: { resolved: false } }),
      db.errorLog.groupBy({ by: ["level"], _count: { id: true } }),
      db.errorLog.count({ where: { createdAt: { gte: last24h } } }),
      db.errorLog.count({ where: { createdAt: { gte: last7d } } }),
      db.errorLog.count({ where: { createdAt: { gte: last30d } } }),
    ]);

  const levelCounts = { error: 0, warn: 0, info: 0 };
  for (const row of byLevel) {
    const key = row.level as keyof typeof levelCounts;
    if (key in levelCounts) levelCounts[key] = row._count.id;
  }

  return {
    total,
    unresolved,
    byLevel: levelCounts,
    trends: {
      last24h: last24hCount,
      last7d: last7dCount,
      last30d: last30dCount,
    },
  };
}
