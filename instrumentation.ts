export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Global process-level error capture (uncaughtException / unhandledRejection)
    const { setupGlobalErrorHandlers } = await import(
      "./src/lib/global-error-handler"
    );
    setupGlobalErrorHandlers();

    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
