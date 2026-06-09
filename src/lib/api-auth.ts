import "server-only";

import { z, type ZodType } from "zod";
import { AppError, ErrorCode } from "@/lib/api-error";
import { getServerSession } from "@/lib/auth";
import { ROLES } from "@/constants/roles";

// ── API auth + request parsing helpers ────────────────────────────────────────
// Shared by every route handler. Unlike requireAuth()/requireAdmin() in
// @/lib/auth (which redirect — correct for pages), these throw AppError so JSON
// endpoints answer with 401/403/422 and flow through withErrorHandler.

export type ApiSession = NonNullable<Awaited<ReturnType<typeof getServerSession>>>;

/** Staff = roles allowed to manage catalog/orders/fulfilment. */
export const STAFF_ROLES: readonly string[] = [ROLES.ADMIN, ROLES.SHOP_MANAGER];

/** Require any authenticated user; 401 otherwise. */
export async function requireUser(): Promise<ApiSession> {
  const session = await getServerSession();
  if (!session) {
    throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401);
  }
  // A deactivated account holds a valid session cookie until it expires. The
  // proxy bypasses /api entirely, so without this check a suspended user keeps
  // full API access. Block every API surface here (all guards call requireUser).
  if (session.user.isActive === false) {
    throw new AppError(
      "Your account has been suspended. Contact support.",
      ErrorCode.FORBIDDEN,
      403
    );
  }
  return session;
}

/** Require an authenticated user whose role is in `allowed`; 401/403 otherwise. */
export async function requireRoles(
  allowed: readonly string[]
): Promise<ApiSession> {
  const session = await requireUser();
  if (!allowed.includes(session.user.role)) {
    throw new AppError(
      "You do not have permission to perform this action",
      ErrorCode.FORBIDDEN,
      403
    );
  }
  return session;
}

/** Require the `admin` role. */
export function requireAdmin(): Promise<ApiSession> {
  return requireRoles([ROLES.ADMIN]);
}

/** Require `admin` or `shop_manager`. */
export function requireStaff(): Promise<ApiSession> {
  return requireRoles(STAFF_ROLES);
}

function issuesToMessage(
  issues: { path: PropertyKey[]; message: string }[],
  fallback: string
): string {
  return issues
    .map((i) => `${i.path.join(".") || fallback}: ${i.message}`)
    .join("; ");
}

/** Parse + validate a JSON request body; 422 on bad JSON or schema failure. */
export async function parseJsonBody<S extends ZodType>(
  req: Request,
  schema: S
): Promise<z.infer<S>> {
  const body = await req.json().catch(() => null);
  if (body === null) {
    throw new AppError(
      "Request body must be valid JSON",
      ErrorCode.VALIDATION_ERROR,
      422
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      issuesToMessage(parsed.error.issues, "body"),
      ErrorCode.VALIDATION_ERROR,
      422
    );
  }
  return parsed.data;
}

/** Validate URL query params against a schema; 422 on failure. */
export function parseQuery<S extends ZodType>(
  searchParams: URLSearchParams,
  schema: S
): z.infer<S> {
  const parsed = schema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    throw new AppError(
      issuesToMessage(parsed.error.issues, "query"),
      ErrorCode.VALIDATION_ERROR,
      422
    );
  }
  return parsed.data;
}
