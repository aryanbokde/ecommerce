import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client — never hand-written, linting it is noise
    "src/generated/**",
    // Generated test artifacts (Playwright HTML report + traces, results).
    "playwright-report/**",
    "test-results/**",
    // Generated coverage report (vitest --coverage).
    "coverage/**",
  ]),
]);

export default eslintConfig;
