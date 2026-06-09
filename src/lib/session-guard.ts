import "server-only";
import { type NextRequest, NextResponse } from "next/server";

// ── Session guard stub ────────────────────────────────────────────────────────
// Auth is not implemented yet, so there is no session to read. getSessionPayload
// always returns null until the real token verification is restored. The HTTP
// response helpers are kept since they are auth-agnostic.
//
// TODO: restore cookie + JWT verification (jose) once auth is back.

type Role = "customer" | "admin" | "shop_manager" | "support";

export interface SessionPayload {
  role: Role;
  userId?: string;
  [key: string]: unknown;
}

export async function getSessionPayload(
  _request: NextRequest
): Promise<SessionPayload | null> {
  void _request;
  return null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
