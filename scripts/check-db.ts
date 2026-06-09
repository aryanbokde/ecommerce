/**
 * Pre-start database connectivity check. Runs via the `prestart` npm hook so a
 * misconfigured or unreachable DATABASE_URL fails fast with a clear message
 * BEFORE `next start` boots and starts serving 500s.
 *
 *   npm start  →  prestart (this) → start
 */
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "../src/generated/prisma";

// Load the same .env / .env.local files Next.js uses (tsx doesn't auto-load them).
loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "\n❌ DATABASE_URL is not set.\n" +
        "   Copy .env.example to .env.local and set a MySQL connection string.\n"
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✓ Database reachable — starting server.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      "\n❌ Cannot connect to the database.\n" +
        `   ${message}\n` +
        "   • Is MySQL running and reachable?\n" +
        "   • Is DATABASE_URL correct? (see .env.example)\n"
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
