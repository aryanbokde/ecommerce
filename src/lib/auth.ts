import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor, admin } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import prisma from "@/server/db";
import { logAudit } from "@/server/services/audit-log.service";
import {
  sendEmail,
  verificationEmail,
  resetPasswordEmail,
  welcomeEmail,
  passwordChangedEmail,
} from "@/lib/email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    autoSignIn: false,
    // Use bcryptjs so existing/seeded bcrypt hashes verify (better-auth defaults
    // to scrypt). Keep hashing consistent on sign-up too.
    password: {
      hash: (password) => bcrypt.hash(password, 10),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
    // Send the password-reset link.
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({ ...resetPasswordEmail(user.name, url), to: user.email });
    },
    // Security confirmation once a reset completes.
    onPasswordReset: async ({ user }) => {
      await sendEmail({ ...passwordChangedEmail(user.name), to: user.email });
    },
  },

  // Email verification: sent on sign-up; required before sign-in (see
  // requireEmailVerification above). Seeded users are pre-verified.
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({ ...verificationEmail(user.name, url), to: user.email });
    },
    // Welcome email once the address is verified.
    afterEmailVerification: async (user) => {
      await sendEmail({ ...welcomeEmail(user.name), to: user.email });
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24, // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // cache for 5 min
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "customer",
        input: false, // not settable by user on signup
      },
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false,
      },
      twoFactorEnabled: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
    },
  },

  // Map better-auth's logical account fields to our existing column names
  // (schema uses NextAuth-style `provider` / `providerAccountId`).
  account: {
    fields: {
      providerId: "provider",
      accountId: "providerAccountId",
    },
  },

  // ── Audit hooks ──────────────────────────────────────────────────────────
  // The top-level `hooks.after` is a single middleware (wrap with
  // createAuthMiddleware), not an array — we branch on ctx.path ourselves.
  // This hook only records SUCCESSFUL email sign-ins: on success the new
  // session lives on `ctx.context.newSession`. Failed sign-ins throw an auth
  // error that can short-circuit after-hooks, so login_failed / blocked
  // attempts are recorded explicitly from the login form via the server
  // actions in (auth)/login/actions.ts — that keeps getRecentFailedLogins
  // complete and avoids double-counting here.
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;

      const newSession = ctx.context.newSession;
      if (!newSession) return; // failure path handled client-side

      const email =
        typeof ctx.body?.email === "string"
          ? ctx.body.email.trim().toLowerCase()
          : undefined;

      await logAudit({
        userId: newSession.user.id,
        action: "login_success",
        status: "success",
        ipAddress: ctx.request?.headers.get("x-forwarded-for") ?? undefined,
        userAgent: ctx.request?.headers.get("user-agent") ?? undefined,
        metadata: email ? { email } : undefined,
      });
    }),
  },

  plugins: [
    twoFactor({
      issuer: process.env.NEXT_PUBLIC_APP_NAME || "MyShop",
      otpOptions: {
        period: 30,
        digits: 6,
      },
    }),
    admin({
      adminRoles: ["admin"],
      // Without this the admin plugin assigns its own default role of "user"
      // on sign-up, overriding the additionalFields default. Our role system
      // is customer · shop_manager · support · admin.
      defaultRole: "customer",
      bannedUserMessage:
        "Your account has been suspended. Contact support.",
    }),
  ],

  // Rate limiting: better-auth enables this for production builds (off in dev).
  // The e2e suite logs in ~30 times in a couple of minutes, which trips the
  // limiter with 429s against a prod build. Let the local test runner disable it
  // via DISABLE_AUTH_RATELIMIT — real deployments leave the flag unset.
  rateLimit: {
    enabled: process.env.DISABLE_AUTH_RATELIMIT !== "true",
  },

  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

// ── Server-side helpers (Server Components / layouts / route handlers) ─────────
// NOTE: redirects use /login (not /auth/login) — auth pages are root-level here.

export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  // Deactivated accounts keep a valid cookie until expiry; bounce them even if
  // the proxy was somehow bypassed (defence-in-depth backstop for page routes).
  if (session.user.isActive === false) {
    redirect("/403");
  }
  return session;
}

export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.user.role)) {
    redirect("/403");
  }
  return session;
}

export async function requireAdmin() {
  return requireRole(["admin"]);
}

export async function requireShopManager() {
  return requireRole(["shop_manager"]);
}

export async function requireSupport() {
  return requireRole(["support"]);
}

export async function requireCustomer() {
  return requireRole(["customer"]);
}
