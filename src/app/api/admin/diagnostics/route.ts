import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireAdmin } from "@/lib/api-auth";
import { storageProvider } from "@/lib/storage";
import prisma from "@/server/db";

// Cloudinary SDK + process introspection need the Node.js runtime.
export const runtime = "nodejs";

// GET /api/admin/diagnostics — admin-only deep system info. Kept OFF the public
// /api/health endpoint so runtime/provider/config details aren't leaked.
export const GET = withErrorHandler(async () => {
  await requireAdmin();

  const [products, orders, users, unresolvedErrors] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.errorLog.count({ where: { resolved: false } }),
  ]);

  const storage = storageProvider();

  return NextResponse.json({
    success: true,
    data: {
      runtime: {
        node: process.version,
        env: process.env.NODE_ENV ?? "unknown",
        platform: process.platform,
        nextRuntime: process.env.NEXT_RUNTIME ?? "nodejs",
      },
      services: {
        database: "mysql",
        storage,
        email: process.env.EMAIL_PROVIDER ?? "log",
      },
      // Booleans only — never echo secret values back to the client.
      config: {
        database: Boolean(process.env.DATABASE_URL),
        authSecret: Boolean(process.env.BETTER_AUTH_SECRET),
        sentry: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
        cloudinary: storage === "cloudinary",
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
      },
      counts: { products, orders, users, unresolvedErrors },
    },
  });
});
