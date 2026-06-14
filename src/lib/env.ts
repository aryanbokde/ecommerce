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
// `next build` collects route page-data by importing every route module — which
// pulls in server modules (razorpay, db, auth) and this validator. Server
// secrets aren't needed to COMPILE (clients are instantiated lazily), so don't
// fail the build when they're absent in the build environment; runtime cold
// start still validates them strictly. Client (NEXT_PUBLIC_*) vars stay strict
// here because they're inlined at build time.
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

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
  // Razorpay is an OPTIONAL payment integration — its client is instantiated
  // lazily and every call guards for missing keys, so a deployment without
  // Razorpay configured still builds and boots (payment attempts then fail
  // gracefully). Keeping these optional also stops a key rotation that briefly
  // clears the vars from breaking the build.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

// Client-exposed — inlined into the bundle at build time. MUST be referenced by
// their full static names so Next.js can replace them.
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a URL"),
  // Optional — the browser checkout widget needs it, but its absence must not
  // fail the build (Razorpay is an optional integration; see server schema).
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
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
  label: string,
  lenient: boolean
): z.infer<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  if (lenient) {
    // Don't block test runs / opt-out / build-phase; surface only what's present.
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

// Validate client vars everywhere (they're inlined → always strict at build).
// Server vars only on the server; lenient under skip OR during `next build`, so
// the build never needs runtime secrets (runtime cold start still validates).
const clientEnv = validate(clientSchema, clientInput, "client", skip);
const serverEnv =
  isServer || skip
    ? validate(serverSchema, process.env, "server", skip || isBuild)
    : ({} as z.infer<typeof serverSchema>);

export const env = { ...serverEnv, ...clientEnv };

export type Env = typeof env;
