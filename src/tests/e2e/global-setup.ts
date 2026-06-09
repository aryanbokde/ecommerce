import type { FullConfig } from "@playwright/test";
import { exec as _exec } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(_exec);

// The dev server compiles each route on its first request, and webpack caching
// is disabled (next.config.ts: config.cache = false), so cold compiles are slow.
// Hitting every route under test once here — sequentially, before the suite —
// moves that one-time compile cost out of the individual test timeouts and
// prevents parallel workers from thrashing the dev server on uncompiled routes.
const ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/auth/login", // legacy alias → redirects to /login
  "/auth/register", // legacy alias → redirects to /register
  // Compile the better-auth catch-all (every test logs in via /api/auth/*); a
  // GET to get-session warms that route so the first login POST isn't cold.
  "/api/auth/get-session",
  // Also compile the sign-in endpoint explicitly; Playwright login uses this POST.
  "/api/auth/sign-in/email",
  // Authenticated areas exercised by the suite. Unauthenticated hits still
  // compile the route (they 401 / redirect to /403), which is all we need —
  // it keeps parallel workers from thrashing the dev server on cold compiles.
  "/shop-manager/dashboard",
  "/shop-manager/inventory",
  "/shop-manager/orders",
  "/shop-manager/low-stock",
  "/shop-manager/products",
  "/api/manager/stats",
  "/api/manager/inventory",
  "/api/manager/fulfillment",
  "/api/manager/low-stock",
  "/support/dashboard",
  "/support/orders",
  "/support/customers",
  "/support/products",
  "/api/support/stats",
  "/api/support/orders",
  "/api/support/customers",
];

async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://127.0.0.1:3000";

  // Ensure the DB is seeded for E2E expectations (users, orders, products).
  // Seed is best-effort: if it fails (no DB), tests will still run and surface
  // the real failure instead of silently missing data.
  try {
    // Use the Prisma seed configured in package.json (tsx prisma/seed.ts).
    const { stdout, stderr } = await exec("npx prisma db seed", {
      timeout: 120_000,
    });
    if (stdout) console.log("prisma seed stdout:\n", stdout);
    if (stderr) console.error("prisma seed stderr:\n", stderr);
  } catch (e) {
    // Surface seed failures to aid triage — warmups may still proceed.
    console.error("prisma db seed failed:", e instanceof Error ? e.message : e);
  }

  for (const route of ROUTES) {
    try {
      // 90s is plenty for a single cold compile; redirect routes are followed.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90_000);
      await fetch(new URL(route, baseURL), { signal: controller.signal });
      clearTimeout(timer);
    } catch {
      // A warmup miss is non-fatal — the test itself will surface a real failure.
    }
  }

  // Ensure the sign-in POST endpoint (used by Playwright API login) is compiled
  // with an explicit POST that includes an Origin header so better-auth's
  // origin checks are satisfied during warmup.
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    await fetch(new URL('/api/auth/sign-in/email', baseURL), {
      method: 'POST',
      headers: { 'content-type': 'application/json', Origin: baseURL },
      body: JSON.stringify({ email: 'manager@shop.com', password: 'Password123!' }),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (err) {
    // Non-fatal: log to make warmup failures visible in CI/local runs.
    console.error('sign-in warmup failed:', err instanceof Error ? err.message : err);
  }
}

export default globalSetup;
