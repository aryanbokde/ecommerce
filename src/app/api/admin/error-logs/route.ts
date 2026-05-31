import { type NextRequest, NextResponse } from "next/server";
import {
  getSessionPayload,
  unauthorized,
  forbidden,
} from "@/lib/session-guard";
import {
  getErrorLogs,
  getErrorStats,
} from "@/server/services/error-log.service";
import { withErrorHandler } from "@/lib/with-error-handler";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getSessionPayload(request);
  if (!session) return unauthorized();
  if (session.role !== "admin") return forbidden();

  const { searchParams } = request.nextUrl;
  const level = searchParams.get("level") as "error" | "warn" | "info" | null;
  const resolvedParam = searchParams.get("resolved");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10))
  );
  const from = searchParams.get("from");
  const to = searchParams.get("to");

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
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
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
