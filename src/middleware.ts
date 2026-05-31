import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// ── Note on logging in middleware ─────────────────────────────────────────────
// Middleware runs in the Edge Runtime where Node.js APIs (Winston, fs) are not
// available. Structured console output is used instead. withErrorHandler() in
// route handlers logs the full response status + duration via after() after the
// response is sent from the Node.js runtime.
// ─────────────────────────────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode("changeme");

type Role = "customer" | "admin" | "shop_manager" | "support";

interface SessionPayload {
  role: Role;
  [key: string]: unknown;
}

async function getSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

function redirectTo(url: string, request: NextRequest) {
  return NextResponse.redirect(new URL(url, request.url));
}

// Edge-safe structured HTTP log — mirrors the Winston "http" level format
function logRequest(
  request: NextRequest,
  requestId: string,
  startedAt: string
) {
  console.log(
    JSON.stringify({
      level: "http",
      timestamp: startedAt,
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      userAgent: request.headers.get("user-agent") ?? undefined,
      // Response status is logged by withErrorHandler via after() in route handlers
    })
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const startedAt = new Date().toISOString();
  const requestId = crypto.randomUUID();

  // Log every incoming request at http level
  logRequest(request, requestId, startedAt);

  // Forward request-id so withErrorHandler can correlate logs
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const token = request.cookies.get("session_token")?.value;
  const session = token ? await getSession(token) : null;
  const role = session?.role ?? null;

  // ── Admin routes ─────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
    if (!session)
      return redirectTo(`/auth/login?redirect=${pathname}`, request);
    if (role !== "admin") return redirectTo("/403", request);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── Shop-manager routes ──────────────────────────────────────────────────
  if (pathname.startsWith("/shop-manager")) {
    if (!session)
      return redirectTo(`/auth/login?redirect=${pathname}`, request);
    if (role !== "shop_manager") return redirectTo("/403", request);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── Support routes ───────────────────────────────────────────────────────
  if (pathname.startsWith("/support")) {
    if (!session)
      return redirectTo(`/auth/login?redirect=${pathname}`, request);
    if (role !== "support") return redirectTo("/403", request);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── Customer routes ──────────────────────────────────────────────────────
  if (
    pathname === "/checkout" ||
    pathname.startsWith("/orders") ||
    pathname === "/profile"
  ) {
    if (!session)
      return redirectTo(`/auth/login?redirect=${pathname}`, request);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── Public ───────────────────────────────────────────────────────────────
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
