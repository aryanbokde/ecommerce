import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";
import { withErrorHandler } from "@/lib/with-error-handler";
import prisma from "@/server/db";

interface HealthResponse {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  version: string;
  checks: {
    database: { status: "ok" | "down"; responseTime: number };
    memory: { used: number; total: number };
    uptime: number;
  };
}

// A DB ping slower than this still answers, but downgrades status to "degraded".
const SLOW_DB_MS = 300;

export const GET = withErrorHandler(async () => {
  // DB connectivity ping. A failure is reported in the body (not thrown), so the
  // health endpoint always responds and the dashboard can render a "down" state.
  let database: HealthResponse["checks"]["database"];
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = { status: "ok", responseTime: Date.now() - startedAt };
  } catch {
    database = { status: "down", responseTime: Date.now() - startedAt };
  }

  const mem = process.memoryUsage();
  const memory = {
    used: Math.round(mem.heapUsed / 1024 / 1024),
    total: Math.round(mem.heapTotal / 1024 / 1024),
  };
  const uptime = Math.floor(process.uptime());

  const status: HealthResponse["status"] =
    database.status === "down"
      ? "error"
      : database.responseTime > SLOW_DB_MS
        ? "degraded"
        : "ok";

  const body: HealthResponse = {
    status,
    timestamp: new Date().toISOString(),
    version: packageJson.version,
    checks: { database, memory, uptime },
  };

  return NextResponse.json(body, { status: status === "error" ? 503 : 200 });
});
