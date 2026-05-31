import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.BETTER_AUTH_SECRET ?? "changeme"
);

type Role = "customer" | "admin" | "shop_manager" | "support";

export interface SessionPayload {
  role: Role;
  userId?: string;
  [key: string]: unknown;
}

export async function getSessionPayload(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
