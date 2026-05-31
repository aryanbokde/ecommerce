import "server-only";
import logger, { logError } from "@/lib/logger";

let registered = false;

/**
 * Register process-level error handlers once.
 * Called from instrumentation.ts (nodejs runtime only) so the handlers survive
 * across all requests for the lifetime of the Node.js process.
 *
 * Edge runtime is excluded because process.on() does not exist there.
 */
export function setupGlobalErrorHandlers(): void {
  if (registered || typeof process === "undefined" || typeof process.on !== "function") {
    return;
  }
  registered = true;

  process.on("uncaughtException", (error: Error) => {
    const timestamp = new Date().toISOString();
    logger.error("uncaughtException — process may be unstable", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp,
    });
    logError(error, {
      metadata: { type: "uncaughtException", timestamp },
    });
    // Do NOT call process.exit() — Next.js manages the process lifecycle.
    // Node.js docs recommend exiting, but that would kill the HTTP server.
    // Use a process supervisor (e.g. PM2) to restart on unhealthy state.
  });

  process.on("unhandledRejection", (reason: unknown) => {
    const timestamp = new Date().toISOString();
    const error =
      reason instanceof Error ? reason : new Error(String(reason));

    logger.error("unhandledRejection", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp,
    });
    logError(error, {
      metadata: { type: "unhandledRejection", timestamp },
    });
  });
}
