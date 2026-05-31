import "server-only";
import { type NextRequest, NextResponse, after } from "next/server";
import logger, { logError } from "@/lib/logger";
import { isAppError } from "@/lib/api-error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteCtx = { params: Promise<Record<string, any>> };

// Overload 1 — simple handler with no route context (e.g. GET /api/health)
export function withErrorHandler(
  handler: (req: NextRequest) => Promise<Response>
): (req: NextRequest) => Promise<Response>;

// Overload 2 — dynamic-route handler (e.g. PATCH /api/admin/error-logs/[id])
export function withErrorHandler<C extends RouteCtx>(
  handler: (req: NextRequest, ctx: C) => Promise<Response>
): (req: NextRequest, ctx: C) => Promise<Response>;

// Implementation
export function withErrorHandler(
  handler: (req: NextRequest, ctx?: RouteCtx) => Promise<Response>
): (req: NextRequest, ctx?: RouteCtx) => Promise<Response> {
  return async (req, ctx) => {
    const start = Date.now();
    const route = req.nextUrl.pathname;
    const method = req.method;

    try {
      const response = await handler(req, ctx);

      // Log the successful response after it is sent — non-blocking
      after(() => {
        logger.http(`${method} ${route}`, {
          status: response.status,
          durationMs: Date.now() - start,
        });
      });

      return response;
    } catch (error) {
      const status = isAppError(error) ? error.statusCode : 500;

      after(() => {
        logger.http(`${method} ${route}`, {
          status,
          durationMs: Date.now() - start,
          error: true,
        });
      });

      logError(error, { route, method });

      if (isAppError(error)) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        );
      }

      const message =
        error instanceof Error ? error.message : "Internal server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
