import "@testing-library/jest-dom";
import { vi } from "vitest";

// ── server-only ─────────────────────────────────────────────────────────────
// The `server-only` package throws when imported outside a server bundle, which
// breaks unit-testing any service/route module that imports it. Stub it out.
vi.mock("server-only", () => ({}));

// ── logger ───────────────────────────────────────────────────────────────────
// Winston pulls in Node transports (files/rotation) we don't want under vitest.
// Stub it globally; individual tests can still spy via the mocked functions.
vi.mock("@/lib/logger", () => ({
  default: {
    http: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logError: vi.fn(),
}));

// ── next/server (after) ──────────────────────────────────────────────────────
// `after()` requires a request scope that doesn't exist under vitest; stub it to
// run inline (or noop) so route handlers wrapped in withErrorHandler are testable.
// Everything else (NextRequest/NextResponse) is preserved from the real module.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => unknown) => { void fn; } };
});

// ── next/navigation ────────────────────────────────────────────────────────────
// Server-side navigation APIs aren't available in jsdom; provide stubs.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push:     vi.fn(),
    replace:  vi.fn(),
    refresh:  vi.fn(),
    back:     vi.fn(),
    forward:  vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname:    vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect:       vi.fn(),
  notFound:       vi.fn(),
}));

// ── next/headers ───────────────────────────────────────────────────────────────
// Headers/cookies are only available in the Next.js server runtime.
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get:    vi.fn(),
    getAll: vi.fn(() => []),
    set:    vi.fn(),
    delete: vi.fn(),
    has:    vi.fn(() => false),
  })),
  headers: vi.fn(() => new Headers()),
}));

// ── better-auth client (@/lib/auth-client) ──────────────────────────────────────
// Avoid spinning up the real better-auth react client in jsdom. We expose both
// the named exports AND the `authClient` object, because the real module exports
// both (login-form imports `authClient`, useAuth imports `useSession`/`signOut`).
vi.mock("@/lib/auth-client", () => {
  const useSession = vi.fn(() => ({ data: null, isPending: false }));
  const signIn = vi.fn();
  const signOut = vi.fn();
  const signUp = vi.fn();
  const twoFactor = vi.fn();
  const adminActions = vi.fn();
  return {
    authClient: { signIn, signUp, signOut, useSession, twoFactor, admin: adminActions },
    useSession,
    signIn,
    signOut,
    signUp,
    twoFactor,
    adminActions,
  };
});

// ── better-auth server helpers (@/lib/auth) ─────────────────────────────────────
// `@/lib/auth` is `server-only` and imports better-auth/prisma — never load it
// for real in jsdom. All guards become no-ops; getServerSession returns null.
vi.mock("@/lib/auth", () => ({
  auth: {},
  getServerSession: vi.fn(() => null),
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
  requireAdmin: vi.fn(),
  requireShopManager: vi.fn(),
  requireSupport: vi.fn(),
  requireCustomer: vi.fn(),
}));

// ── Email (@/lib/email) ──────────────────────────────────────────────────────
// sendEmail() now reads EmailTemplate / StoreSetting / writes EmailLog via Prisma.
// Stub the whole module so services/routes under test don't touch the DB just to
// fire a (fire-and-forget) email. Template builders return inert objects.
vi.mock("@/lib/email", () => {
  const builder = vi.fn(() => ({ to: "", templateKey: "", fallback: {} }));
  return {
    sendEmail: vi.fn(async () => ({ skipped: false, status: "sent" })),
    sendTemplateTest: vi.fn(async () => ({ skipped: false, status: "sent" })),
    renderTemplatePreview: vi.fn(async () => "<html></html>"),
    verificationEmail: builder,
    resetPasswordEmail: builder,
    welcomeEmail: builder,
    passwordChangedEmail: builder,
    orderConfirmationEmail: builder,
    orderShippedEmail: builder,
    orderDeliveredEmail: builder,
    orderCancelledEmail: builder,
    roleChangedEmail: builder,
    accountBannedEmail: builder,
  };
});

// ── Razorpay ─────────────────────────────────────────────────────────────────
// Stub the SDK so importing @/lib/razorpay never loads the real client. Tests
// that exercise createRazorpayOrder provide their own richer mock per-file.
vi.mock("razorpay", () => ({ default: vi.fn() }));

// @/lib/env + @/lib/razorpay read these at module-eval; vitest doesn't load
// .env.local, so set deterministic TEST values here (setupFiles run before test
// imports). Env validation is also relaxed under NODE_ENV=test.
process.env.RAZORPAY_KEY_ID = "rzp_test_dummy";
process.env.RAZORPAY_KEY_SECRET = "test_secret_dummy_123";
process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret_123";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_dummy";
