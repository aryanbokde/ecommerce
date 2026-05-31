// BEFORE withErrorHandler:
//
//   export async function GET() {
//     const [database] = await Promise.all([checkDatabase()]);
//     ...
//     return NextResponse.json(body, { status: allOk ? 200 : 503 });
//   }
//
// AFTER — withErrorHandler catches any unexpected throw, logs it, and returns
// a structured JSON 500. The handler itself still controls happy-path responses.

import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import packageJson from "../../../../package.json";
import { withErrorHandler } from "@/lib/with-error-handler";

const prisma = new PrismaClient();

type CheckStatus = "ok" | "error";
type HealthStatus = "ok" | "degraded";

interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  checks: {
    database: CheckStatus;
    memory: { used: number; total: number };
    uptime: number;
  };
}

async function checkDatabase(): Promise<CheckStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "error";
  }
}

export const GET = withErrorHandler(async () => {
  const database = await checkDatabase();

  const mem = process.memoryUsage();
  const memory = {
    used: Math.round(mem.heapUsed / 1024 / 1024),
    total: Math.round(mem.heapTotal / 1024 / 1024),
  };
  const uptime = Math.floor(process.uptime());
  const allOk = database === "ok";

  const body: HealthResponse = {
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: packageJson.version,
    checks: { database, memory, uptime },
  };

  return NextResponse.json(body, { status: allOk ? 200 : 503 });
});
