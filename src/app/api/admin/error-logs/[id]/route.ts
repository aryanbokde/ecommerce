import { type NextRequest, NextResponse } from "next/server";
import {
  getSessionPayload,
  unauthorized,
  forbidden,
} from "@/lib/session-guard";
import { resolveErrorLog } from "@/server/services/error-log.service";
import db from "@/lib/db";
import { withErrorHandler } from "@/lib/with-error-handler";

export const PATCH = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await getSessionPayload(request);
    if (!session) return unauthorized();
    if (session.role !== "admin") return forbidden();

    const { id } = await params;
    const log = await resolveErrorLog(id);
    return NextResponse.json(log);
  }
);

export const DELETE = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await getSessionPayload(request);
    if (!session) return unauthorized();
    if (session.role !== "admin") return forbidden();

    const { id } = await params;
    await db.errorLog.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }
);
