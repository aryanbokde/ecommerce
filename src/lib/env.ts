import { z } from "zod";

// ── Runtime environment validation ────────────────────────────────────────────
// Parses + validates process.env once at module load and exports a typed `env`.
// Missing/invalid required vars throw a clear, actionable error at startup
// instead of failing deep in a request. Server-only secrets and NEXT_PUBLIC_*
// (client-exposed) vars are validated separately so the client bundle never
// pulls in — or depends on — server secrets.
//
// Skip validation (e.g. CI steps that don't boot the app) with
// SKIP_ENV_VALIDATION=1. Validation is also relaxed under NODE_ENV=test.

const isServer = typeof window === "undefined";
const skip =
  process.env.SKIP_ENV_VALIDATION === "1" || process.env.NODE_ENV === "test";

// Server-only — never sent to the browser.
const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // MySQL connection string (mysql://user:pass@host:3306/db).
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // Shared secret for better-auth session signing + proxy JWT verification.
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  // Canonical origin better-auth issues callbacks/cookies against.
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a URL"),
  // Razorpay server credentials (test keys are prefixed rzp_test_).
  RAZORPAY_KEY_ID: z.string().min(1, "RAZORPAY_KEY_ID is required"),
  RAZORPAY_KEY_SECRET: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),
  // Optional — only required once Razorpay webhooks are enabled. The webhook
  // route guards this at runtime, so a deployment without webhooks still boots.
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

// Client-exposed — inlined into the bundle at build time. MUST be referenced by
// their full static names so Next.js can replace them.
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a URL"),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z
    .string()
    .min(1, "NEXT_PUBLIC_RAZORPAY_KEY_ID is required"),
  // Optional — empty until a Sentry project is wired up.
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional().default(""),
});

const clientInput = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
};

function validate<S extends z.ZodObject<z.ZodRawShape>>(
  schema: S,
  input: unknown,
  label: string
): z.infer<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  if (skip) {
    // Don't block test runs / opt-out builds; surface only what's present.
    return schema.partial().parse(input) as z.infer<S>;
  }

  const details = result.error.issues
    .map((i) => `  • ${String(i.path[0] ?? "?")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `\n❌ Invalid ${label} environment variables:\n${details}\n\n` +
      `Copy .env.example to .env.local and fill in the missing values.\n`
  );
}

// Validate client vars everywhere (they're inlined); server vars only on the
// server (or under skip, so server unit tests can read them from process.env).
const clientEnv = validate(clientSchema, clientInput, "client");
const serverEnv =
  isServer || skip
    ? validate(serverSchema, process.env, "server")
    : ({} as z.infer<typeof serverSchema>);

export const env = { ...serverEnv, ...clientEnv };

export type Env = typeof env;
