# Consolidated Project Prompt - Phase 1 and Phase 2 Complete

## Role

You are a Senior Next.js Enterprise Architect building a production-ready multi-vendor eCommerce platform.

Continue from the existing project state. Do not restart the project, do not recreate the app, and do not remove existing files unless explicitly requested.

## Current Project Status

Phase 1 and Phase 2 are complete.

The project currently includes:

- Next.js 15
- React 19
- TypeScript
- App Router
- Tailwind CSS
- ESLint
- `src/` directory
- `@/*` import alias
- Enterprise folder structure
- Route groups
- Placeholder pages
- Dependency stack
- Testing infrastructure
- Code quality tooling
- Verification scripts
- Phase 2 health report

This is now the single markdown source of truth for the project. Previous README, Phase 2 report, and phase setup notes have been merged into this file.

## Project Overview

The application is an enterprise eCommerce platform scaffolded with Next.js. Phase 1 created the framework and architecture only. Phase 2 installed and configured dependencies, testing infrastructure, verification commands, and code quality tooling only.

No business implementation has been created yet.

## Phase 1 Completed Work

The project was initialized as a Next.js eCommerce application with only architecture and placeholders.

### Framework Setup

Enabled:

- Next.js 15
- React 19
- TypeScript
- App Router
- Tailwind CSS
- ESLint
- `src/` directory
- Import alias `@/*`

Equivalent installation commands:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
npm install next@15 eslint-config-next@15
```

### Phase 1 Scope

Phase 1 intentionally did not install or implement:

- Better Auth
- Prisma
- MySQL
- Axios
- Zustand
- React Query
- Razorpay
- Resend
- UploadThing
- Authentication logic
- Database logic
- Payment logic
- Email logic
- Upload logic

### Route Groups

Created route groups:

- `src/app/(public)`
- `src/app/(auth)`
- `src/app/(customer)`
- `src/app/(vendor)`
- `src/app/(admin)`

Each route group contains:

- `layout.tsx`
- `loading.tsx`
- `error.tsx`

### Public Routes

Created placeholder routes:

- `/`
- `/shop`
- `/product/[slug]`
- `/category/[slug]`
- `/brand/[slug]`
- `/search`
- `/cart`
- `/wishlist`
- `/checkout`
- `/compare`
- `/blog`
- `/faq`
- `/about`
- `/contact`

### Auth Routes

Created placeholder routes:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/verify-email`

### Customer Routes

Created placeholder routes:

- `/customer`
- `/customer/orders`
- `/customer/profile`
- `/customer/addresses`
- `/customer/reviews`
- `/customer/settings`

### Vendor Routes

Created placeholder routes:

- `/vendor`
- `/vendor/products`
- `/vendor/inventory`
- `/vendor/orders`
- `/vendor/earnings`
- `/vendor/reports`
- `/vendor/settings`

### Admin Routes

Created placeholder routes:

- `/admin`
- `/admin/users`
- `/admin/roles`
- `/admin/permissions`
- `/admin/products`
- `/admin/categories`
- `/admin/brands`
- `/admin/orders`
- `/admin/inventory`
- `/admin/coupons`
- `/admin/reviews`
- `/admin/reports`
- `/admin/audit-logs`
- `/admin/settings`

### Enterprise Folder Structure

Created:

```text
src/
  app/
  components/
    ui/
    forms/
    tables/
    charts/
    modals/
    public/
    customer/
    vendor/
    admin/
  features/
    auth/
    users/
    roles/
    permissions/
    products/
    categories/
    brands/
    inventory/
    orders/
    payments/
    shipping/
    reviews/
    coupons/
    notifications/
    analytics/
  server/
    actions/
    services/
    repositories/
    validators/
    permissions/
    queries/
    commands/
  providers/
  hooks/
  store/
  lib/
  constants/
  config/
  types/
  emails/
  middleware/
  styles/
```

### Folder Responsibilities

`src/app` contains App Router route groups, layouts, loading states, error boundaries, and page placeholders.

`src/components/ui` is reserved for reusable low-level interface primitives.

`src/components/forms` is reserved for shared form components.

`src/components/tables` is reserved for reusable table and data-grid components.

`src/components/charts` is reserved for chart wrappers and visualization components.

`src/components/modals` is reserved for shared dialog and modal components.

`src/components/public` is reserved for storefront-facing components.

`src/components/customer` is reserved for customer account UI.

`src/components/vendor` is reserved for vendor dashboard UI.

`src/components/admin` is reserved for admin dashboard UI.

`src/features` groups domain modules by business capability. Each feature can later own its components, types, server interactions, and tests.

`src/server/actions` is reserved for server actions.

`src/server/services` is reserved for business-service orchestration.

`src/server/repositories` is reserved for future persistence boundaries.

`src/server/validators` is reserved for request and form validation schemas.

`src/server/permissions` is reserved for authorization checks.

`src/server/queries` is reserved for read-side server operations.

`src/server/commands` is reserved for write-side server operations.

`src/providers` is reserved for React providers.

`src/hooks` is reserved for reusable React hooks.

`src/store` is reserved for future client state modules.

`src/lib` is reserved for shared utility functions.

`src/constants` is reserved for application constants.

`src/config` is reserved for typed application configuration.

`src/types` is reserved for shared TypeScript types.

`src/emails` is reserved for future email templates.

`src/middleware` is reserved for middleware helpers. Add root `src/middleware.ts` only when middleware behavior is implemented.

`src/styles` is reserved for shared styling assets beyond `src/app/globals.css`.

## Phase 2 Completed Work

Phase 2 installed and configured dependencies, verification, testing infrastructure, and quality tooling.

No authentication logic, database schema, business modules, product logic, or API logic was created.

### Production Dependencies Installed

- `better-auth`
- `bcryptjs`
- `prisma`
- `@prisma/client`
- `mysql2`
- `zod`
- `react-hook-form`
- `zustand`
- `axios`
- `@tanstack/react-query`
- `sonner`
- `lucide-react`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `@tanstack/react-table`
- `resend`
- `react-email`
- `uploadthing`
- `recharts`
- `date-fns`
- `next-sitemap`
- `schema-dts`
- `pino`
- `helmet`
- `rate-limiter-flexible`
- `dompurify`
- `razorpay`

### Development Dependencies Installed

- `jest`
- `jest-environment-jsdom`
- `ts-jest`
- `ts-node`
- `@types/jest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `supertest`
- `@types/supertest`
- `playwright`
- `@playwright/test`
- `msw`
- `prettier`
- `prettier-plugin-tailwindcss`
- `eslint-config-prettier`
- `husky`
- `lint-staged`

### Production Install Command

```bash
npm install better-auth bcryptjs prisma @prisma/client mysql2 zod react-hook-form zustand axios @tanstack/react-query sonner lucide-react class-variance-authority clsx tailwind-merge @tanstack/react-table resend react-email uploadthing recharts date-fns next-sitemap schema-dts pino helmet rate-limiter-flexible dompurify razorpay
```

### Development Install Command

```bash
npm install -D jest jest-environment-jsdom ts-jest @types/jest @testing-library/react @testing-library/jest-dom @testing-library/user-event supertest @types/supertest playwright msw prettier prettier-plugin-tailwindcss eslint-config-prettier husky lint-staged
npm install -D @playwright/test ts-node
```

### Testing Structure

Created:

```text
tests/
  unit/
  integration/
  e2e/
  mocks/
  fixtures/
  setup/
```

### Configuration Files

Created:

- `.prettierrc`
- `.prettierignore`
- `jest.config.ts`
- `playwright.config.ts`
- `tests/setup/jest.setup.ts`

### NPM Scripts

Configured:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "type-check": "tsc --noEmit",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:e2e": "playwright test",
  "verify": "npm run lint && npm run type-check && npm run test",
  "prepare": "husky"
}
```

### Dependency Mapping

- `better-auth`, `bcryptjs`: authentication, sessions, RBAC foundation, and password hashing.
- `prisma`, `@prisma/client`, `mysql2`: ORM, migrations, and MySQL connectivity.
- `zod`: schema validation for forms, server inputs, and API boundaries.
- `react-hook-form`: form state and validation integration.
- `zustand`: cart, wishlist, auth view state, and theme stores.
- `axios`: external APIs, payment APIs, and third-party integrations.
- `@tanstack/react-query`: server-state caching, pagination, and infinite loading.
- `sonner`: toast notifications.
- `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`: UI icons, variants, and class utilities.
- `@tanstack/react-table`: admin, vendor, and report tables.
- `resend`, `react-email`: transactional email delivery and templates.
- `uploadthing`: product images, avatars, and documents.
- `recharts`: analytics and report charts.
- `date-fns`: date formatting and calculations.
- `next-sitemap`, `schema-dts`: sitemap generation and structured data.
- `pino`: application logging.
- `helmet`, `rate-limiter-flexible`, `dompurify`: security headers, rate limiting, and XSS protection.
- `razorpay`: payment processing.
- `jest`, `jest-environment-jsdom`, `ts-jest`, `ts-node`, `@types/jest`: unit testing and TypeScript Jest config support.
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`: React component testing.
- `supertest`, `@types/supertest`: API and route testing.
- `playwright`, `@playwright/test`: end-to-end testing.
- `msw`: API mocking.
- `prettier`, `prettier-plugin-tailwindcss`, `eslint-config-prettier`: formatting and lint compatibility.
- `husky`, `lint-staged`: pre-commit validation.

### Folder Mapping

`src/features` will own domain-specific feature modules such as auth, catalog, orders, inventory, payments, and analytics.

`src/server` will own server actions, services, repositories, validation, permission checks, queries, and commands.

`src/store` is reserved for Zustand stores such as cart, wishlist, auth view state, and theme preferences.

`src/providers` is reserved for app-level providers such as React Query, theme, auth session, and toast providers.

`src/lib` is reserved for shared utilities such as HTTP clients, logging helpers, date helpers, class-name merging, security helpers, and SEO helpers.

`src/components` is reserved for reusable UI, forms, tables, charts, modals, and area-specific presentation components.

## Verification Status

The following commands passed:

- `npx prisma --version`
- `npm run lint`
- `npm run type-check`
- `npm run test`
- `npm run test:e2e`
- `npm run build`

Verification commands:

```bash
npm ls
npm audit
npx prisma --version
npm run lint
npm run type-check
npm run test
npm run test:e2e
npm run build
```

Observed verification results:

- `npm ls`: completed. NPM reports several top-level native helper packages as extraneous, but exits successfully. They are installed as transitive native runtime helpers.
- `npx prisma --version`: passed with Prisma `7.8.0` and `@prisma/client` `7.8.0`.
- `npm run lint`: passed.
- `npm run type-check`: passed.
- `npm run test`: passed, 1 test suite and 1 test.
- `npm run test:e2e`: passed, 1 Chromium smoke test.
- `npm run build`: passed, 47 app routes generated.

## Security Status

`npm audit fix` was executed.

Remaining audit issues require `npm audit fix --force`, but force-fixing would introduce breaking dependency changes, including downgrading required packages such as Next.js, Prisma, or UploadThing.

Do not run `npm audit fix --force` unless explicitly approved.

Current unresolved advisories are transitive:

- `next` includes a vulnerable nested `postcss` range according to npm audit.
- `prisma` includes a vulnerable nested `@hono/node-server` range through `@prisma/dev`.
- `uploadthing` includes a vulnerable nested `effect` range.

Decision: do not run `npm audit fix --force` because it breaks the required Next.js 15 baseline and installed Phase 2 dependency line.

## Testing Readiness Report

- Jest: configured with `next/jest`.
- Testing Library: setup file configured.
- Playwright: configured with Chromium project and reusable local dev server.
- Coverage: configured through `npm run test:coverage`.

## Production Readiness Checklist

- [x] Dependencies installed.
- [x] Testing folders created.
- [x] Jest configured.
- [x] Playwright configured.
- [x] Prettier configured.
- [x] Lint-staged configured.
- [x] Dependency verification complete.
- [x] Security audit reviewed.
- [x] Type checking passed.
- [x] Unit tests passed.
- [x] E2E smoke test passed.
- [x] Build passed.

## Environment Notes

- Node.js: `20.20.2`.
- TypeScript: `5.9.3`.
- Prisma install emits an engine warning for transitive `@prisma/streams-local`, which declares Node `>=22.0.0`; Prisma CLI verification still passes on the current Node 20 runtime.
- `next lint` passes on Next.js 15 but is deprecated for future Next.js 16 migration.

## Development

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Important Rules For Next Work

Do not:

- Reinstall Next.js from scratch.
- Delete the enterprise folder structure.
- Remove route groups.
- Create database schema unless the next phase explicitly requests it.
- Create authentication logic unless the next phase explicitly requests it.
- Create product, order, payment, or API business logic unless requested.
- Force audit fixes that downgrade the required dependency stack.

Do:

- Follow the existing folder structure.
- Keep code modular and enterprise-ready.
- Use TypeScript strictly.
- Use the installed dependencies only where appropriate.
- Run verification after changes.
- Update reports or README files when setup changes.

## Recommended Verification After Future Changes

Run:

```bash
npm run lint
npm run type-check
npm run test
npm run build
```

For e2e-related changes, also run:

```bash
npm run test:e2e
```

## Ready For Phase 3

The project is ready for Phase 3: Shadcn UI and core configuration.

Phase 3 should focus on UI foundation and app-level configuration only, unless a future prompt says otherwise.

## Original Phase 2 Request Summary

The Phase 2 request was dependency installation, verification, auto-fix, and testing infrastructure. It required installation and validation of authentication, database, validation, forms, state management, API, cache, notifications, UI utilities, tables, email, upload, analytics, utility, SEO, logging, security, payment, unit testing, component testing, API testing, e2e testing, mocking, code quality, and git-hook packages.

It also required:

- Optimized production and development install commands.
- `npm ls`.
- `npm audit`.
- `npx prisma --version`.
- Linting.
- Type checking.
- Auto-fix workflow using `npm audit fix`.
- Testing folder structure.
- `.prettierrc`.
- `.prettierignore`.
- `jest.config.ts`.
- `playwright.config.ts`.
- NPM scripts.
- Folder mapping.
- Compatibility report.
- Security report.
- Testing readiness report.
- Production readiness checklist.
- Final dependency health report.

Success criteria: the project must install successfully, pass linting, pass type checking, complete dependency verification, and be fully prepared for Phase 3.
