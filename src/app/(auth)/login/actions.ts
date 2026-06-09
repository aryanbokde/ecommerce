"use server";

import { headers } from "next/headers";
import {
  logAudit,
  getRecentFailedLogins,
} from "@/server/services/audit-log.service";

// Rate-limit window for failed logins, keyed by email identifier.
const FAILED_LOGIN_WINDOW_MINUTES = 15;
const MAX_FAILED_LOGINS = 5;

async function clientMeta() {
  const h = await headers();
  return {
    ipAddress: h.get("x-forwarded-for") ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  };
}

/**
 * Pre-flight check before attempting sign-in. Returns whether the identifier
 * is currently locked out and how many attempts remain in the window.
 */
export async function checkLoginRateLimit(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { blocked: false, remaining: MAX_FAILED_LOGINS };
  }

  const recentFailures = await getRecentFailedLogins(
    normalized,
    FAILED_LOGIN_WINDOW_MINUTES
  );

  const blocked = recentFailures >= MAX_FAILED_LOGINS;
  return {
    blocked,
    remaining: Math.max(0, MAX_FAILED_LOGINS - recentFailures),
  };
}

/**
 * Record a failed sign-in attempt. Called from the login form's error branch
 * so `getRecentFailedLogins` has complete data even when better-auth's
 * after-hook is short-circuited by the thrown auth error.
 */
export async function recordLoginFailure(email: string) {
  const normalized = email.trim().toLowerCase();
  await logAudit({
    action: "login_failed",
    status: "failed",
    metadata: normalized ? { email: normalized } : undefined,
    ...(await clientMeta()),
  });
}

/**
 * Record a rate-limit block (distinct from an ordinary credential failure).
 */
export async function recordLoginBlocked(email: string) {
  const normalized = email.trim().toLowerCase();
  await logAudit({
    action: "login_failed",
    status: "blocked",
    metadata: normalized ? { email: normalized } : undefined,
    ...(await clientMeta()),
  });
}
