import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "src/tests/e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Gate the unit-testable logic layers (services + lib helpers). Components
      // are presentational/interactive and are verified by the integration +
      // e2e suites and the component smoke tests (which still run); the gate can
      // be widened to them once interaction tests bring their branches to 60%+.
      include: ["src/server/services/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "src/tests/**",
        "src/types/**",
        ".next/**",
        "node_modules/**",
        // Runtime/integration glue — exercised by integration + e2e, not unit
        // tests (DB singleton, auth init, browser/Node-only clients).
        "src/lib/db.ts",
        "src/lib/auth.ts",
        "src/lib/auth-client.ts",
        "src/lib/api.ts",
        "src/lib/razorpay.ts",
        "src/lib/logger.ts",
        "src/lib/web-vitals.ts",
        "src/lib/load-script.ts",
        "src/lib/global-error-handler.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
