import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getErrorLogs,
  getErrorStats,
  deleteErrorLogs,
  deleteErrorLogsByFilter,
  setErrorLogsResolved,
} from "@/server/services/error-log.service";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireRoles, parseJsonBody } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";

// Admin-only: lists persisted error logs + summary stats.
export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireRoles([ROLES.ADMIN]);
  const { searchParams } = request.nextUrl;
  const level = searchParams.get("level") as "error" | "warn" | "info" | null;
  const resolvedParam = searchParams.get("resolved");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10))
  );

  const [logsResult, stats] = await Promise.all([
    getErrorLogs({
      level: level ?? undefined,
      resolved:
        resolvedParam === "true"
          ? true
          : resolvedParam === "false"
            ? false
            : undefined,
      page,
      limit,
    }),
    getErrorStats(),
  ]);

  return NextResponse.json({
    logs: logsResult.items,
    total: logsResult.total,
    page: logsResult.page,
    totalPages: logsResult.totalPages,
    stats,
  });
});

// Two delete modes:
//   { ids: [...] }                         → remove those specific rows
//   { filter: { level?, resolved? } }      → remove EVERY row matching the
//                                            filter (empty filter = clear all)
const bulkDeleteSchema = z.union([
  z.object({
    ids: z.array(z.string().min(1)).min(1, "Select at least one log"),
  }),
  z.object({
    filter: z.object({
      level: z.enum(["error", "warn", "info"]).optional(),
      resolved: z.boolean().optional(),
    }),
  }),
]);

// Admin-only: bulk-delete error logs by id or by filter.
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  await requireRoles([ROLES.ADMIN]);
  const body = await parseJsonBody(request, bulkDeleteSchema);
  const deleted =
    "ids" in body
      ? await deleteErrorLogs(body.ids)
      : await deleteErrorLogsByFilter(body.filter);
  return NextResponse.json({ ok: true, deleted });
});

const bulkResolveSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one log"),
  resolved: z.boolean(),
});

// Admin-only: bulk-update resolved state by id.
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  await requireRoles([ROLES.ADMIN]);
  const { ids, resolved } = await parseJsonBody(request, bulkResolveSchema);
  const updated = await setErrorLogsResolved(ids, resolved);
  return NextResponse.json({ ok: true, updated });
});
