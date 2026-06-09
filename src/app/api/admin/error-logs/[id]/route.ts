import { type NextRequest, NextResponse } from "next/server";
import {
  resolveErrorLog,
  markErrorLogSeen,
  deleteErrorLog,
} from "@/server/services/error-log.service";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireRoles } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";

type RouteCtx = { params: Promise<{ id: string }> };

// PATCH /api/admin/error-logs/[id] — admin only. Body `{ seen: true }` marks the
// log seen (clears it from the new badge); otherwise it marks it resolved.
export const PATCH = withErrorHandler(
  async (request: NextRequest, { params }: RouteCtx) => {
    await requireRoles([ROLES.ADMIN]);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const log =
      body?.seen === true
        ? await markErrorLogSeen(id)
        : await resolveErrorLog(id);
    return NextResponse.json(log);
  }
);

// DELETE /api/admin/error-logs/[id] — delete an error log (admin only).
export const DELETE = withErrorHandler(
  async (_request: NextRequest, { params }: RouteCtx) => {
    await requireRoles([ROLES.ADMIN]);
    const { id } = await params;
    await deleteErrorLog(id);
    return NextResponse.json({ ok: true });
  }
);
