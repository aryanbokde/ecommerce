import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, createAccessControl } from "better-auth/plugins";
// prisma-client-js (legacy generator) is used because Prisma 7 has no MySQL driver adapter yet.
// The client reads DATABASE_URL from the environment at runtime via the Prisma binary engine.
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

// ── Access control statements (resource → allowed actions) ────────────────────
const ac = createAccessControl({
  product:  ["create", "read", "update", "delete"],
  order:    ["create", "read", "update", "delete"],
  user:     ["create", "read", "update", "delete"],
  review:   ["create", "read", "update", "delete"],
  coupon:   ["create", "read", "update", "delete"],
  report:   ["read"],
});

// ── Per-role permission sets ───────────────────────────────────────────────────
const customerRole = ac.newRole({
  product: ["read"],
  order:   ["create", "read"],
  review:  ["create", "read"],
});

const shopManagerRole = ac.newRole({
  product: ["create", "read", "update", "delete"],
  order:   ["read", "update"],
  coupon:  ["create", "read", "update", "delete"],
  review:  ["read", "update", "delete"],
  report:  ["read"],
});

const supportRole = ac.newRole({
  order:  ["read", "update"],
  user:   ["read"],
  review: ["read"],
});

const adminRole = ac.newRole({
  product: ["create", "read", "update", "delete"],
  order:   ["create", "read", "update", "delete"],
  user:    ["create", "read", "update", "delete"],
  review:  ["create", "read", "update", "delete"],
  coupon:  ["create", "read", "update", "delete"],
  report:  ["read"],
});

// ── Auth instance ─────────────────────────────────────────────────────────────
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,

  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // ── Email & password auth ─────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },

  // TODO: add social providers once client IDs/secrets are available
  // socialProviders: {
  //   google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! },
  //   github: { clientId: process.env.GITHUB_CLIENT_ID!, clientSecret: process.env.GITHUB_CLIENT_SECRET! },
  // },

  // ── Session ───────────────────────────────────────────────────────────────
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge:  60 * 60 * 24,    // refresh session if older than 1 day
  },

  // ── Cookie — name must match what middleware reads ─────────────────────────
  advanced: {
    cookies: {
      session_token: {
        name: "session_token",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  // ── User model ────────────────────────────────────────────────────────────
  user: {
    additionalFields: {
      // role is managed by the admin plugin; declared here for type inference
      role: {
        type: "string",
        defaultValue: "customer",
        input: false, // users cannot self-assign their role
      },
    },
  },

  // ── Plugins ───────────────────────────────────────────────────────────────
  plugins: [
    admin({
      ac,
      roles: {
        customer:     customerRole,
        shop_manager: shopManagerRole,
        support:      supportRole,
        admin:        adminRole,
      },
      defaultRole: "customer", // every new sign-up starts as customer
    }),
  ],
});

// ── Type helpers ─────────────────────────────────────────────────────────────
export type Session = typeof auth.$Infer.Session;
export type User    = typeof auth.$Infer.Session.user;
export type Role    = "customer" | "shop_manager" | "admin" | "support";

// ── Server-side action helpers ────────────────────────────────────────────────
// Call these from Server Actions or Route Handlers, passing `headers: await headers()`
export const { signInEmail, signUpEmail, signOut, getSession } = auth.api;
