import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Reads the session straight from better-auth (no manual JWT decoding).
// Proxy runs on the Node.js runtime in Next 16, so importing the auth instance
// (Prisma-backed) is fine here. cookieCache (5 min) keeps most reads DB-free.

// NOTE: paths reflect THIS app's actual URLs:
//   - auth pages are root-level (the (auth) route group): /login, /register, ...
//   - the admin dashboard is /dashboard (the (admin) group), not /admin
const PUBLIC_ROUTES = ["/", "/products", "/shop", "/cart", "/403"];
const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/two-factor",
];
const ADMIN_ROUTES = ["/dashboard"];
const SHOP_MANAGER_ROUTES = ["/shop-manager"];
const SUPPORT_ROUTES = ["/support"];
// Customer areas (/checkout, /orders, /profile) just require an active session —
// enforced by the generic "no session → /login" check below.

// Per-role landing page (shared shape with the login form's redirect).
function roleHome(role: string): string {
  switch (role) {
    case "admin":
      return "/dashboard";
    case "shop_manager":
      return "/shop-manager/dashboard";
    case "support":
      return "/support/dashboard";
    default:
      return "/";
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const matches = (routes: string[]) =>
    routes.some((r) => pathname === r || pathname.startsWith(r + "/"));

  const isPublic = matches(PUBLIC_ROUTES);
  const isAuthRoute = matches(AUTH_ROUTES);
  // Bypass ALL /api routes — they authenticate themselves and must return JSON
  // (401), never an HTML login redirect.
  const isApi = pathname.startsWith("/api");

  if (isApi) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Auth pages (login/register/…): a user who is already signed in has no
  // business here — send them to their role's home instead of showing the form.
  if (isAuthRoute) {
    const session = await auth.api.getSession({ headers: req.headers });
    if (session?.user) {
      return addSecurityHeaders(
        NextResponse.redirect(new URL(roleHome(session.user.role), req.url))
      );
    }
    return addSecurityHeaders(NextResponse.next());
  }

  if (isPublic) {
    return addSecurityHeaders(NextResponse.next());
  }

  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role;
  const isActive = session.user.isActive;

  if (!isActive) {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  if (matches(ADMIN_ROUTES) && role !== "admin") {
    return NextResponse.redirect(new URL("/403", req.url));
  }
  if (matches(SHOP_MANAGER_ROUTES) && role !== "shop_manager") {
    return NextResponse.redirect(new URL("/403", req.url));
  }
  if (matches(SUPPORT_ROUTES) && role !== "support") {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  return addSecurityHeaders(NextResponse.next());
}

function addSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  return res;
}

export const config = {
  matcher: [
    // Skip Next internals, image assets, AND public SEO files (robots.txt,
    // sitemap*.xml) — those must stay crawler-reachable, never redirected to /login.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.txt|.*\\.xml).*)",
  ],
};
