# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # start dev server (http://localhost:3000)
npm run build        # production build (also runs next-sitemap via postbuild)
npm run lint         # ESLint
npm run test         # vitest run (unit, one-shot)
npm run test:watch   # vitest watch
npm run test:e2e     # Playwright end-to-end
npm run health       # curl /api/health (requires running server)

npx prisma generate                   # regenerate client after schema change (no DB needed)
npx prisma db push                    # push schema to DB (requires MySQL running)
npx prisma studio                     # GUI to inspect/edit data
```

To run a single unit test file:
```bash
npx vitest run src/tests/unit/utils.test.ts
```

## Stack at a Glance

| Layer | Choice |
|---|---|
| Framework | Next.js **16.2.6** App Router |
| UI primitives | **Base UI** (`@base-ui/react`) — NOT Radix |
| Styling | Tailwind CSS **v4** (`@import` in `globals.css`, no `tailwind.config.ts`) |
| Auth | **better-auth v1.6.12** with admin + RBAC plugin |
| Database | MySQL 8 via **Prisma 6.19.3** (`prisma-client-js`, output → `src/generated/prisma`) |
| HTTP client | axios + axios-retry (client-side only) |
| Logging | **Winston** (Node.js only) + `winston-daily-rotate-file` |
| Error tracking | Sentry (server + edge configs in root) |
| Testing | Vitest + Testing Library (unit) · Playwright (E2E) |
| State | Zustand + TanStack Query |
| Toast | Sonner (`<Toaster>` mounted in root layout) |

## Next.js 16 Breaking Changes to Know

- **`params` and `searchParams` are both `Promise<{...}>`** — always `await` them in page and route handler signatures.
- **`middleware.ts` is deprecated** in favour of `proxy.ts` (still works but should be migrated).
- **`after()`** from `next/server` schedules non-blocking work after a response is sent; it works in Route Handlers (Node.js runtime), not in middleware (Edge Runtime).
- **`instrumentation.ts`** runs once per process and is the right place for one-time server-side init; read `NEXT_RUNTIME` before importing Node-only modules.

## Route Group → URL Mapping

```
src/app/(admin)/dashboard/...  →  URL /dashboard/...
src/app/(auth)/...             →  URL /auth/...
src/app/(public)/...           →  URL /...
```
The `(group)` segment does **not** appear in the URL.

## Authentication & Session

- **better-auth** owns session creation and the cookie. The cookie name is `session_token` (httpOnly, sameSite=lax).
- **Middleware** (`src/middleware.ts`) reads and JWT-verifies the cookie using `jose`. Role-based redirects happen here.
- **Route handlers** use `getSessionPayload(request)` from `src/lib/session-guard.ts` (server-only) for in-handler auth checks. Returns `null` on missing/invalid token.
- **Known bug**: `auth.ts` passes `provider: "postgresql"` to `prismaAdapter` — should be `"mysql"`. Do not fix silently; it breaks the DB adapter.
- Four roles: `customer` · `shop_manager` · `support` · `admin`.

## Base UI Component Gotchas

Components under `src/components/ui/` are built on **Base UI**, not Radix. Key differences from shadcn/Radix:

- **`Button`** — uses a `render` prop for polymorphism, not `asChild`. Example: `<Button render={<Link href="/" />}>Go home</Button>`.
- **`Select`** — `onValueChange` is typed `(value: string | null) => void` (null when cleared). Do not type-narrow to `string` only.
- **`Badge`** — no built-in `warning` / yellow variant; apply className directly for custom colors.
- Base UI primitives compose via `render` prop, not slot injection.

## Error Handling Architecture

Every layer has a handler so nothing escapes silently:

```
process-level       instrumentation.ts → setupGlobalErrorHandlers()
                    (also called at module level in src/app/layout.tsx)
root layout error   src/app/global-error.tsx (has own <html>/<body>; uses inline styles)
route handlers      withErrorHandler() HOF — wraps every exported handler
client errors       global-error.tsx POSTs to POST /api/errors → logError() server-side
```

`withErrorHandler` (src/lib/with-error-handler.ts):
- Catches thrown `AppError` → returns structured `{ error, code }` JSON at `error.statusCode`.
- Catches generic errors → 500.
- Uses `after()` to log method/route/status/durationMs non-blockingly.

`logError()` (src/lib/logger.ts):
- Writes to Winston (console + files).
- Fire-and-forgets a dynamic import of `saveErrorLog` from the error-log service to persist to DB.
- Guard: `typeof window === "undefined"` keeps Prisma out of the client bundle.

## Logging

Winston runs in **Node.js runtime only** (has `fs`/`net` dependencies).

- **Dev**: colorized `printf` format to console.
- **Prod**: JSON to console.
- File transports: `logs/error.log` (ERROR only), `logs/combined.log` (all), `logs/app-%DATE%.log` (daily rotation, 14 days, 20 MB max).
- **Middleware** runs in Edge Runtime — use `console.log(JSON.stringify({...}))` there, never import Winston.
- Calling convention: `logger.info("message", { meta })` — message first, meta second (opposite of pino).

## Prisma

- Schema: `prisma/schema.prisma` — provider `mysql`, client output `src/generated/prisma`.
- Singleton: `src/lib/db.ts` exports `db` (global reuse in dev, fresh in prod).
- Server services under `src/server/services/` all start with `import "server-only"` to prevent accidental client bundle inclusion.
- `Prisma.InputJsonValue` is the correct type for `Json?` fields — do not cast as `Record<string, unknown>`.
- After any schema change: `npx prisma generate` (offline) then `npx prisma db push` (needs DB).

## Axios API Client

`src/lib/api.ts` is `"use client"` only. It:
- Sets `baseURL` from `NEXT_PUBLIC_APP_URL`, sends credentials cookie on every request.
- Retries 3× on network errors and 5xx with exponential backoff.
- Normalises every error through `parseApiError()` → always resolves to `AppError`.

Do not import `src/lib/api.ts` from server components or route handlers.

## AppError Pattern

Throw `new AppError(message, ErrorCode.X, statusCode)` from any server code. `withErrorHandler` catches it and returns the correct HTTP response. `isAppError()` is the type guard.

## Environment Variables Required

```
DATABASE_URL          # MySQL connection string
BETTER_AUTH_SECRET    # used by both better-auth and middleware JWT verification
NEXT_PUBLIC_APP_URL   # canonical origin (e.g. http://localhost:3000)
NEXT_PUBLIC_SENTRY_DSN # Sentry project DSN (currently empty)
```

`middleware.ts` still has a hardcoded `"changeme"` fallback for `JWT_SECRET` — it should use only `BETTER_AUTH_SECRET`.
