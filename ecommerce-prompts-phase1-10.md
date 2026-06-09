# Ecommerce App — Complete Build Prompts (Phase 1 → Phase 10)

> **Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · better-auth · Prisma + MySQL 8 · shadcn/ui · Vitest + Playwright · Razorpay
> **Roles:** `customer` · `shop_manager` · `admin` · `support`
> **How to use:** Run each prompt in order. Each is self-contained and ends with a verify/fix step. Don't skip the verify loops — they catch issues before they compound.

---

## Table of Contents

- [Phase 1 — Setup + Folder Structure](#phase-1--setup--folder-structure)
- [Phase 2 — Middleware + Auth Skeleton](#phase-2--middleware--auth-skeleton)
- [Phase 3 — Packages, UI, Auth, Testing](#phase-3--packages-ui-auth-testing)
- [Supplementary — Notifications, Errors, Security, Health, SEO](#supplementary--notifications-errors-security-health-seo)
- [Supplementary — Error Logging](#supplementary--error-logging)
- [Phase 4 — Auth Database Schema + better-auth Wiring](#phase-4--auth-database-schema--better-auth-wiring)
- [Phase 5 — Core API Routes](#phase-5--core-api-routes)
- [Phase 6 — Storefront UI](#phase-6--storefront-ui)
- [Phase 7 — Customer Area + Checkout](#phase-7--customer-area--checkout)
- [Seeder — Populate the Database](#seeder--populate-the-database)
- [Phase 8 — Admin Dashboard](#phase-8--admin-dashboard)
- [Phase 9 — Shop Manager Dashboard](#phase-9--shop-manager-dashboard)
- [Support Role — Lookup & Assistance Dashboard](#support-role--lookup--assistance-dashboard)
- [Phase 10 — Testing, SEO & Deployment](#phase-10--testing-seo--deployment)

---

## Phase 1 — Setup + Folder Structure

### Step 1.1 — Install Next.js

```
You are a senior Next.js developer. I am building a single-vendor ecommerce application with role-based access control (roles: customer, shop_manager, admin, and support).

Initialize a new Next.js project in the CURRENT directory using the latest stable version of Next.js (use App Router). Use the following configuration:

- Framework: Next.js (latest stable, App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Linting: ESLint
- src/ directory: yes
- Import alias: @/* mapped to src/*
- No Turbopack (use default webpack for stability)

Run the following command:
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack

After installation, confirm the Next.js version installed and show me the generated package.json dependencies.
```

### Step 1.2 — Folder structure with empty folders + .gitkeep

```
Create the complete folder structure for my Next.js ecommerce app using bash commands.

Rules:
- Create empty folders only — no code, no content inside files
- Every empty folder must contain a .gitkeep file so Git tracks it
- Use mkdir -p to create all folders in one go
- Use touch to create all .gitkeep files
- Do NOT create any .ts, .tsx, .js, or any code files — folders and .gitkeep only
- After running, show the final tree output using: find src -type d | sort

Run these exact bash commands:

# 1. Create all frontend folders
mkdir -p src/app/\(auth\)/login
mkdir -p src/app/\(auth\)/register
mkdir -p src/app/\(store\)/products/\[slug\]
mkdir -p src/app/\(store\)/cart
mkdir -p src/app/\(store\)/shop
mkdir -p src/app/\(customer\)/checkout
mkdir -p src/app/\(customer\)/orders/\[id\]
mkdir -p src/app/\(customer\)/profile
mkdir -p src/app/\(admin\)/dashboard
mkdir -p src/app/\(shop-manager\)/dashboard
mkdir -p src/app/\(support\)/dashboard

# 2. Create all API folders
mkdir -p src/app/api/auth/login
mkdir -p src/app/api/auth/register
mkdir -p src/app/api/auth/logout
mkdir -p src/app/api/auth/me
mkdir -p src/app/api/products/\[id\]
mkdir -p src/app/api/categories
mkdir -p src/app/api/cart
mkdir -p src/app/api/orders/\[id\]
mkdir -p src/app/api/checkout
mkdir -p src/app/api/users/\[id\]
mkdir -p src/app/api/admin/stats
mkdir -p src/app/api/admin/users
mkdir -p src/app/api/webhooks/payment

# 3. Create all shared src folders
mkdir -p src/components/ui
mkdir -p src/components/layout
mkdir -p src/components/shared
mkdir -p src/hooks
mkdir -p src/types
mkdir -p src/constants
mkdir -p src/lib

# 4. Create all server-side folders
mkdir -p src/server/db/schema
mkdir -p src/server/services
mkdir -p src/server/validators

# 5. Add .gitkeep to every leaf folder
find src -type d -empty -exec touch {}/.gitkeep \;

# 6. Verify — show all folders
find src -type d | sort
```

**Folder structure reference (frontend):**

```
src/
├── app/
│   ├── (auth)/login, register
│   ├── (store)/                  ← PUBLIC (no login)
│   │   ├── layout.tsx, page.tsx  ← storefront home
│   │   ├── products/[slug]/      ← listing + detail
│   │   ├── cart/                 ← cart page
│   │   └── shop/                 ← categories
│   ├── (customer)/               ← LOGIN REQUIRED
│   │   ├── layout.tsx            ← auth guard
│   │   ├── checkout/, orders/[id]/, profile/
│   ├── (admin)/dashboard/
│   ├── (shop-manager)/dashboard/
│   ├── (support)/dashboard/
│   ├── layout.tsx, not-found.tsx
├── components/ui, layout, shared
├── hooks/, types/, constants/, lib/
└── middleware.ts
```

**Folder structure reference (backend):**

```
src/app/api/
├── auth/login, register, logout, me
├── products/[id], categories, cart
├── orders/[id], checkout, users/[id]
├── admin/stats, admin/users
└── webhooks/payment
src/server/
├── db/index.ts, db/schema/
├── services/   ← business logic
└── validators/ ← zod schemas
```

---

## Phase 2 — Middleware + Auth Skeleton

> Install first: `npm install jose bcryptjs zod` · `npm install -D @types/bcryptjs`
> Add to `.env.local`: `JWT_SECRET=your_super_secret_key_min_32_chars`

### Step 2.1 — Middleware route protection

```
Write the complete src/middleware.ts file for my Next.js ecommerce app.

Route access rules:
- PUBLIC (no login needed):
    /                    → storefront home
    /products/*          → product listing & detail
    /shop/*              → shop / categories
    /cart                → cart page
    /auth/login          → login page
    /auth/register       → register page
    /api/products/*      → public product API
    /api/categories/*    → public category API

- CUSTOMER (must be logged in, role: customer):
    /checkout            → redirect to /auth/login?redirect=/checkout if not logged in
    /orders/*            → redirect to /auth/login if not logged in
    /profile             → redirect to /auth/login if not logged in

- ADMIN only:
    /admin/*             → redirect to /auth/login if not logged in, 403 if wrong role

- SHOP_MANAGER only:
    /shop-manager/*      → redirect to /auth/login if not logged in, 403 if wrong role

- SUPPORT only:
    /support/*           → redirect to /auth/login if not logged in, 403 if wrong role

Implementation rules:
1. Read the session token from a cookie named "session_token"
2. Decode it using jose (JWT) — add a TODO for the real secret env var
3. Extract role from the JWT payload field "role"
4. Export a config matcher that excludes _next/static, _next/image, favicon.ico
5. For wrong-role access, redirect to /403 page (not a hard error)
6. Keep the file clean, typed with TypeScript, and add short inline comments

Show me the final src/middleware.ts file only.
```

### Step 2.2 — Auth API routes (login, register, logout, me)

```
Create the following four API route handler files for authentication.
Use Next.js App Router route handlers (not pages/api).
Use jose for JWT signing/verifying. Use bcryptjs for password hashing.
Add TODO comments where DB calls will go — no real DB yet, use a mock user object.

Files to create:

1. src/app/api/auth/register/route.ts
   - POST: accept { name, email, password }
   - Validate with zod (name min 2, email valid, password min 8)
   - Hash password with bcryptjs (saltRounds: 10)
   - TODO: save user to DB
   - Return 201 with { message: "registered" }

2. src/app/api/auth/login/route.ts
   - POST: accept { email, password }
   - TODO: fetch user from DB by email
   - Mock user: { id: "u1", email: "test@test.com", role: "customer", passwordHash: bcrypt of "password123" }
   - Compare password with bcryptjs
   - On success: sign JWT with payload { sub: userId, role, email }, expires in 7d
   - Set cookie "session_token" (httpOnly, sameSite: strict, path: /)
   - Return 200 with { user: { id, email, role } }
   - On fail: return 401 { error: "Invalid credentials" }

3. src/app/api/auth/logout/route.ts
   - POST: clear the "session_token" cookie
   - Return 200 { message: "logged out" }

4. src/app/api/auth/me/route.ts
   - GET: read "session_token" cookie
   - Verify and decode JWT
   - Return 200 { user: { id, email, role } } or 401 if invalid/missing

Use these env vars (add TODOs if not set):
  JWT_SECRET — for jose signing

Show me all four files with full implementation.
```

### Step 2.3 — Role constants + client auth hook

```
Create these two files:

1. src/constants/roles.ts
   - Export ROLES const:
       CUSTOMER: "customer"
       SHOP_MANAGER: "shop_manager"
       ADMIN: "admin"
       SUPPORT: "support"
   - Export ROLE_HOME_ROUTES mapping each role to its default redirect after login:
       customer       → "/checkout" (or fallback "/orders")
       shop_manager   → "/shop-manager/dashboard"
       admin          → "/admin/dashboard"
       support        → "/support/dashboard"
   - Export a type: Role = typeof ROLES[keyof typeof ROLES]

2. src/hooks/useAuth.ts
   - Client-side React hook ("use client")
   - Calls GET /api/auth/me on mount
   - Returns { user, isLoading, isAuthenticated, logout }
   - logout() calls POST /api/auth/logout then redirects to /auth/login using next/navigation
   - user shape: { id: string, email: string, role: Role } | null
   - Handle fetch errors gracefully (set user to null, isAuthenticated false)

Show me both complete files.
```

### Step 2.4 — Layout guards (per-role layout.tsx)

```
Create four layout.tsx files that guard their route groups server-side.
Use Next.js server components (no "use client"). Read the cookie directly using
next/headers cookies() and verify JWT with jose.

1. src/app/(customer)/layout.tsx
   - If no valid session → redirect("/auth/login")
   - If role is not "customer" → redirect("/403")
   - Otherwise render children with a minimal CustomerLayout wrapper component

2. src/app/(admin)/layout.tsx
   - If no valid session → redirect("/auth/login")
   - If role is not "admin" → redirect("/403")
   - Otherwise render children with AdminLayout wrapper

3. src/app/(shop-manager)/layout.tsx
   - If no valid session → redirect("/auth/login")
   - If role is not "shop_manager" → redirect("/403")
   - Otherwise render children with ShopManagerLayout wrapper

4. src/app/(support)/layout.tsx
   - If no valid session → redirect("/auth/login")
   - If role is not "support" → redirect("/403")
   - Otherwise render children with SupportLayout wrapper

Each layout wrapper is a simple div with a role-specific data-layout attribute for now.
Use a shared helper src/lib/auth.ts → getSessionUser() that handles the cookie + JWT decode logic (DRY — don't repeat in each layout).

Show me all five files: the shared auth.ts helper first, then all four layouts.
```

---

## Phase 3 — Packages, UI, Auth, Testing

### Step 3.1 — Install all core packages

```
Install all required packages for my Next.js ecommerce app. Run each group separately and confirm no peer dependency errors before moving to the next.

# Auth
npm install better-auth@latest

# Database
npm install prisma @prisma/client
npx prisma init --datasource-provider mysql

# Validation & schema
npm install zod zod-validation-error

# State management
npm install zustand immer

# Server utilities
npm install jose bcryptjs server-only
npm install -D @types/bcryptjs

# HTTP & data fetching
npm install axios @tanstack/react-query @tanstack/react-query-devtools

# Forms
npm install react-hook-form @hookform/resolvers

# Utilities
npm install clsx tailwind-merge class-variance-authority lucide-react
npm install date-fns nanoid

# Dev tools
npm install -D prettier eslint-config-prettier
npm install -D @types/node

After all installs, run: npm ls --depth=0
Show me the output and flag any peer dependency warnings.
```

### Step 3.2 — Setup shadcn/ui

```
Initialize and configure shadcn/ui for my Next.js ecommerce app.

Run: npx shadcn@latest init
When prompted, choose: Style Default, Base color Neutral, CSS variables Yes

Then install all the components we will need for ecommerce:
  npx shadcn@latest add button input label form card badge avatar dialog sheet
  npx shadcn@latest add dropdown-menu navigation-menu table tabs toast skeleton
  npx shadcn@latest add separator scroll-area select checkbox alert breadcrumb pagination

After all installs:
1. Show me the final components.json
2. Confirm src/components/ui/ folder exists and list all files inside it
3. Show me the updated tailwind.config.ts to confirm shadcn classes are included
```

### Step 3.3 — Setup better-auth

```
Setup better-auth for my Next.js ecommerce app with full role-based access control.
My roles are: customer, shop_manager, admin, support

Do the following:

1. Create src/lib/auth.ts — server-side better-auth instance:
   - Use Prisma adapter (better-auth/adapters/prisma)
   - Enable plugins: roles (with all 4 roles defined), email & password
   - Set trustedOrigins from env: BETTER_AUTH_URL
   - Export: auth (the instance), signIn, signUp, signOut helpers
   - Session cookie name: "session_token"
   - Add a TODO for social providers (Google, GitHub) — not implemented yet

2. Create src/lib/auth-client.ts — client-side better-auth instance:
   - Use createAuthClient from "better-auth/react"
   - Export: authClient, useSession, signIn, signOut, signUp
   - baseURL from env: NEXT_PUBLIC_APP_URL

3. Create src/app/api/auth/[...all]/route.ts — catch-all route handler:
   - Import auth from src/lib/auth
   - Export GET and POST handlers using toNextJsHandler(auth.handler)

4. Update src/lib/auth.ts to include:
   - User fields: name, email, role, emailVerified
   - Session expiry: 7 days
   - After signup: default role = "customer"

5. Add these to .env.local (show me what to add):
   BETTER_AUTH_SECRET=
   BETTER_AUTH_URL=http://localhost:3000
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   DATABASE_URL=mysql://root:password@localhost:3306/ecommerce_db

Show me all files created with full content.
```

### Step 3.4 — Setup Vitest (unit tests)

```
Setup Vitest for unit and integration testing in my Next.js app.

# Install
npm install -D vitest @vitejs/plugin-react jsdom
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @vitest/coverage-v8 @vitest/ui

Steps:
1. Create vitest.config.ts at project root:
   - environment: jsdom, globals: true
   - setupFiles: ["./src/tests/setup.ts"]
   - coverage provider: v8
   - include: ["src/**/*.test.ts", "src/**/*.test.tsx"]
   - exclude: ["node_modules", ".next", "src/tests/e2e"]

2. Create src/tests/setup.ts:
   - import @testing-library/jest-dom
   - Mock next/navigation (useRouter, usePathname, redirect)
   - Mock next/headers (cookies)

3. Create src/tests/unit/utils.test.ts:
   - Test cn() class merge from lib/utils — 3 cases: merges, empty, conditional

4. Add scripts to package.json:
   "test": "vitest run", "test:watch": "vitest",
   "test:ui": "vitest --ui", "test:coverage": "vitest run --coverage"

5. Run npm test and confirm it passes. If errors, fix them and show me the fixed files.
```

### Step 3.5 — Setup Playwright (e2e tests)

```
Setup Playwright for end-to-end testing in my Next.js ecommerce app.

# Install
npm install -D @playwright/test
npx playwright install --with-deps chromium

Steps:
1. Create playwright.config.ts:
   - testDir: ./src/tests/e2e, baseURL: http://localhost:3000
   - chromium only
   - webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true }
   - retries: 2 on CI, 0 locally; reporter: html; trace: on-first-retry

2. Create src/tests/e2e/home.spec.ts:
   - Visit / → expect title contains "ecommerce" or status 200, nav element exists

3. Create src/tests/e2e/auth.spec.ts:
   - Visit /auth/login → expect email + password inputs + submit button exist
   - Do NOT fill or submit

4. Add scripts: "test:e2e": "playwright test", "test:e2e:ui": "playwright test --ui",
   "test:e2e:report": "playwright show-report"

5. Run: npm run test:e2e. Fix failures, show final passing output.
```

### Step 3.6 — Auto verify + fix loop (Claude test agent)

```
You are now acting as a test agent. Run the full test suite, read every failure, fix the root cause, and re-run until all tests pass. Follow this exact loop:

LOOP START:
  1. Run: npm run build
     - If build fails: read the error, fix the file causing it, go to step 1
     - If build passes: go to step 2
  2. Run: npm test
     - If any test fails: read error + stack trace → identify exact file/line
       → fix ONLY that file → show what failed, what changed, why → go to step 1
     - If all unit tests pass: go to step 3
  3. Run: npm run test:e2e
     - If any e2e fails: fix the page or spec → show what failed/changed/why → go to step 1
     - If all e2e pass: go to step 4
  4. Run: npm run lint
     - If errors: npx eslint . --fix, then fix remaining manually → go to step 1
     - If lint passes: LOOP END

RULES:
- Never skip a failing test — fix it or tell me why it cannot be fixed
- Never delete a test to make it pass
- Never use @ts-ignore or eslint-disable to hide errors
- After each fix, explain: root cause → what you changed → expected result
- Maximum 5 loop iterations — if still failing, show a summary of remaining issues

When the loop ends successfully, show:
  ✓ Build: passed  ✓ Unit tests: X passed  ✓ E2E tests: X passed  ✓ Lint: passed
```

---

## Supplementary — Notifications, Errors, Security, Health, SEO

### Step A — Confirm MySQL 8 + Prisma

```
Confirm my Prisma database provider is MySQL 8 (NOT PostgreSQL, and note there is no "MySQL 12").

1. Install MySQL client for Prisma: npm install mysql2

2. Update prisma/schema.prisma datasource:
   - provider = "mysql"
   - String fields needing long text use @db.Text or @db.LongText
   - IDs use String @id @default(cuid())

3. Update .env.local:
   DATABASE_URL="mysql://root:password@localhost:3306/ecommerce_db"

4. Run: npx prisma generate
5. Show me the datasource block, the DATABASE_URL line, and the generate output.
   After switching, run npx prisma db push (once DB is running) to verify connection.
```

### Step B — Notifications + toast UI

```
Install and configure a notification/toast library. Use sonner as primary (best App Router support).

1. npm install sonner
2. Add <Toaster position="top-right" richColors closeButton /> to src/app/layout.tsx body
3. Create src/lib/notify.ts with typed helpers:
   notifySuccess, notifyError, notifyWarning, notifyInfo (message, description?)
   notifyLoading(message) → returns id, notifyDismiss(id)
   notifyPromise(promise, { loading, success, error })
4. Add usage example comments.
Show me src/lib/notify.ts and the updated src/app/layout.tsx.
```

### Step C — Error handling (UI + global boundary)

```
Setup complete error handling — UI error boundaries and API error handling.

# Install
npm install react-error-boundary axios-retry

1. src/components/shared/ErrorBoundary.tsx — react-error-boundary with custom fallback
   (Try again button, Go home link, shadcn Card/Button)
2. src/components/shared/ErrorFallback.tsx — { error, resetErrorBoundary }, shadcn Alert destructive
3. src/lib/api-error.ts — AppError class (message, code, statusCode); error codes enum
   (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, SERVER_ERROR);
   parseApiError(error): AppError; isAppError(error)
4. src/lib/api.ts — axios instance with response interceptor (parseApiError),
   axios-retry (3 retries, exponential backoff), request interceptor attaching session cookie
5. src/app/error.tsx — Next.js global error page ("use client")
6. src/app/not-found.tsx — 404 page with shadcn components

Show me all files created.
```

### Step D — Security libraries

```
Install and configure all security libraries.

# Install
npm install next-safe isomorphic-dompurify rate-limiter-flexible
npm install -D @types/dompurify

1. src/lib/security.ts — sanitizeInput(string), sanitizeObject<T>(obj),
   isValidEmail(email), isValidUrl(url)
2. Add security headers to middleware for ALL routes:
   X-Frame-Options DENY, X-Content-Type-Options nosniff,
   Referrer-Policy strict-origin-when-cross-origin,
   Permissions-Policy camera=() microphone=() geolocation=(),
   X-XSS-Protection 1; mode=block
3. next.config.ts — CSP default-src 'self', HSTS max-age=63072000 (use next-safe)
4. src/lib/rate-limit.ts — rate-limiter-flexible in-memory:
   auth 5 req/15min/IP, api 100 req/min/IP; checkRateLimit(ip, type)
5. Show example of sanitizeObject() use in an API route.

Show me all files with full content.
```

### Step E — Site health + monitoring

```
Setup site health monitoring and logging.

# Install
npm install pino pino-pretty web-vitals

1. src/lib/logger.ts — pino: pretty in dev, JSON in prod;
   logger.info/warn/error/debug; child context helper { requestId, userId, route }
2. src/app/api/health/route.ts — GET returns
   { status, timestamp, version, checks: { database, memory, uptime } }
   DB check via prisma.$queryRaw`SELECT 1`; 200 if ok, 503 if any fail
3. src/lib/web-vitals.ts — report CLS, FID, FCP, LCP, TTFB to /api/health/vitals
4. package.json script: "health": "curl http://localhost:3000/api/health | json_pp"

Show me all files created with full content.
```

### Step F — SEO friendly libraries

```
Setup complete SEO configuration.

# Install
npm install next-sitemap schema-dts

1. src/lib/seo.ts — buildMetadata(overrides), buildProductMetadata(product),
   buildCategoryMetadata(category); title template, description, keywords, openGraph, twitter
2. Update src/app/layout.tsx metadata:
   title template "%s | MyShop" default "MyShop", description, metadataBase,
   openGraph website/en_US, robots index+follow, icons
3. src/app/sitemap.ts — dynamic: /, /products, /products/[slug], /shop with
   changeFrequency + priority per type
4. src/app/robots.ts — allow public, disallow /admin/*, /shop-manager/*, /support/*, /api/*; sitemap URL
5. next-sitemap.config.js — siteUrl from env, generateRobotsTxt false,
   exclude admin/manager/support
6. package.json: "postbuild": "next-sitemap"
7. src/components/shared/JsonLd.tsx — ProductJsonLd, BreadcrumbJsonLd, OrganizationJsonLd

Show me all files created with full content.
```

### Step G — Verify loop for new packages

```
Run the full verify and fix loop for all newly installed packages (Steps A–F).

LOOP:
1. npm run build — fix TS errors, module-not-found (check import paths/names)
2. npm test — add missing mocks to src/tests/setup.ts:
   vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
   vi.mock("pino", () => ({ default: () => ({ info: vi.fn(), error: vi.fn() }) }))
3. npm run lint — npx eslint . --fix, fix remaining manually
4. Verify imports work: notifySuccess, logger, sanitizeInput; GET /api/health returns ok
5. Show final checklist (MySQL 8, sonner, error boundary, security headers,
   rate limiting, health endpoint, SEO, build/tests/lint).

RULES: no @ts-ignore / eslint-disable to hide errors; never delete tests; fix root cause; max 5 iterations.
```

---

## Supplementary — Error Logging

### Step H.1 — Install error logging packages

```
Install all error logging and log management packages.

# Primary error logger — winston (file + console + rotation)
npm install winston winston-daily-rotate-file
# HTTP request logging
npm install pino-http
# In-app error log viewer
npm install @highlight-run/next

After install run: npm ls winston, npm ls winston-daily-rotate-file, npm ls @highlight-run/next
Show me output and confirm no peer dependency issues.
```

### Step H.2 — Winston logger (file + console + rotate)

```
Create a complete Winston logger that writes logs to files AND console with daily rotation.

Create src/lib/logger.ts (replace any existing pino logger):
1. Transports: Console (colorized dev / JSON prod);
   File logs/error.log (ERROR only); File logs/combined.log (ALL);
   DailyRotateFile logs/app-%DATE%.log (daily, 14 days, 20MB max)
2. Levels: error, warn, info, http, debug (prod: info+, dev: debug+)
3. Each entry: { timestamp, level, message, service, environment, ...meta }
4. Helpers: logger.info/warn/error/http/debug(message, meta?)
5. logError(error, context?) — extracts message/stack/name, logs at error level,
   also saves to DB error log table (TODO for now)
6. Add logs/ to .gitignore

Show me src/lib/logger.ts and the updated .gitignore.
```

### Step H.3 — Error log table in MySQL + Prisma model

```
Add an ErrorLog model to Prisma schema to store all errors in MySQL.

model ErrorLog {
  id          String   @id @default(cuid())
  level       String   @default("error")
  message     String   @db.Text
  stack       String?  @db.LongText
  code        String?
  statusCode  Int?
  userId      String?
  route       String?
  method      String?
  userAgent   String?  @db.Text
  ipAddress   String?
  metadata    Json?
  resolved    Boolean  @default(false)
  createdAt   DateTime @default(now())
  @@index([level]) @@index([createdAt]) @@index([resolved]) @@index([userId])
  @@map("error_logs")
}

1. Add model, run npx prisma db push && npx prisma generate
2. src/server/services/error-log.service.ts:
   saveErrorLog(data), getErrorLogs(filters { level, resolved, from, to, page, limit }),
   resolveErrorLog(id), getErrorStats() { total, unresolved, byLevel } over 24h/7d/30d
3. Update src/lib/logger.ts logError() to call saveErrorLog (level error/warn only),
   wrapped in try/catch (never let logging break the app)

Show me all files with full implementation.
```

### Step H.4 — Admin error log dashboard page

```
Create an error log viewer inside the admin dashboard to browse, filter, and resolve errors.

1. src/app/api/admin/error-logs/route.ts — GET paginated (level, resolved, page, limit, from, to),
   admin only, returns { logs, total, page, totalPages, stats }
2. src/app/api/admin/error-logs/[id]/route.ts — PATCH resolve, DELETE entry; admin only
3. src/app/(admin)/dashboard/error-logs/page.tsx:
   - Stat cards: Total, Unresolved, Last 24h, Last 7d
   - shadcn Card/Badge/Table/Button/Select
   - Columns: Level badge (error=red/warn=yellow/info=blue), Message, Route, User, Time, Status, Actions
   - Filter by level + status; Resolve button (PATCH); expand row for stack trace
   - Pagination; empty state "No errors logged"
4. Add sidebar link /admin/dashboard/error-logs, icon AlertCircle, unresolved count badge

Show me all files with full implementation.
```

### Step H.5 — Global error capture

```
Setup global error capture so every unhandled error is automatically logged.

1. src/lib/global-error-handler.ts — setupGlobalErrorHandlers():
   process.on uncaughtException + unhandledRejection → logError() + logger.error()
2. src/app/global-error.tsx ("use client") — { error, reset }, logError() on mount,
   clean UI (Something went wrong, Try again, Go home), shadcn Card/Button/Alert
3. src/lib/with-error-handler.ts — HOF: withErrorHandler(handler) wraps API routes in try/catch,
   logError(error, { route, method }), returns proper JSON (AppError uses statusCode, else 500)
4. Wrap every export GET/POST/PATCH/DELETE in src/app/api/ with withErrorHandler();
   show one before/after example
5. Add HTTP request logging in middleware: log method, path, status via logger.http()

Show me all files with full content and the before/after example.
```

---

## Phase 4 — Auth Database Schema + better-auth Wiring

> **7-table auth ERD:** User → Session, Account, TwoFactor (1:1), PasswordReset, AuditLog. Verification stands alone (no FK).

### Step 4.1 — User model

```
Add the User model to prisma/schema.prisma for my Next.js ecommerce app with MySQL 8.

model User {
  id                 String    @id @default(cuid())
  name               String
  email              String    @unique
  emailVerified      Boolean   @default(false)
  image              String?   @db.Text
  role               String    @default("customer")
  twoFactorEnabled   Boolean   @default(false)
  isActive           Boolean   @default(true)
  bannedAt           DateTime?
  bannedReason       String?   @db.Text
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  sessions           Session[]
  accounts           Account[]
  twoFactor          TwoFactor?
  passwordResets     PasswordReset[]
  auditLogs          AuditLog[]
  @@index([email]) @@index([role]) @@index([isActive])
  @@map("users")
}

Rules: String @id @default(cuid()) for all IDs; role = customer|shop_manager|admin|support;
isActive false = soft delete; bannedAt+bannedReason for admin ban; @@map snake_case table.

After adding: npx prisma format && npx prisma validate. Show output, fix errors.
```

### Step 4.2 — Session model

```
Add the Session model to prisma/schema.prisma.

model Session {
  id           String   @id @default(cuid())
  userId       String
  token        String   @unique @db.VarChar(512)
  ipAddress    String?
  userAgent    String?  @db.Text
  deviceType   String?
  isActive     Boolean  @default(true)
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId]) @@index([token]) @@index([expiresAt]) @@index([isActive])
  @@map("sessions")
}

Notes: token = JWT/opaque token; deviceType mobile|desktop|tablet; onDelete Cascade;
expiresAt for cleanup; isActive false = logged out; one user → many sessions.

After adding: npx prisma format && npx prisma validate. Show output, fix errors.
```

### Step 4.3 — Account model

```
Add the Account model to prisma/schema.prisma.

model Account {
  id                    String    @id @default(cuid())
  userId                String
  provider              String
  providerAccountId     String
  accessToken           String?   @db.Text
  refreshToken          String?   @db.Text
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  idToken               String?   @db.Text
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
  @@index([userId])
  @@map("accounts")
}

Notes: provider "credential" for email/password (providerAccountId = userId, password bcrypt),
"google"/"github" for OAuth (accessToken/refreshToken); one user → many accounts.

After adding: npx prisma format && npx prisma validate. Show output.
```

### Step 4.4 — Verification model

```
Add the Verification model to prisma/schema.prisma. Generic token table for all verification flows.

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String   @unique
  type       String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  @@index([identifier]) @@index([value]) @@index([expiresAt])
  @@map("verifications")
}

Notes: identifier = email or userId; value = token/code (unique); type =
email_verification|password_reset|magic_link|otp|change_email; all expire; no userId FK
(identifier can be email before user exists).

After adding: npx prisma format && npx prisma validate. Show output.
```

### Step 4.5 — TwoFactor model

```
Add the TwoFactor model to prisma/schema.prisma. Stores TOTP secret + backup codes.

model TwoFactor {
  id          String   @id @default(cuid())
  userId      String   @unique
  secret      String
  backupCodes String   @db.Text
  isEnabled   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("two_factors")
}

Notes: userId @unique (1:1); secret = base32 TOTP (TODO: encrypt at rest);
backupCodes = JSON array of single-use codes; isEnabled true only after first TOTP verify.
TODO: encrypt secret + backupCodes with AES-256 before storing.

After adding: npx prisma format && npx prisma validate. Show output.
```

### Step 4.6 — PasswordReset model

```
Add the PasswordReset model to prisma/schema.prisma. Single-use reset tokens.

model PasswordReset {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  used      Boolean  @default(false)
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId]) @@index([token]) @@index([expiresAt])
  @@map("password_resets")
}

Notes: token = 32-byte hex (unique); used true = consumed; 1 hour expiry;
separate from Verification because it needs userId FK + used flag.
On reset: create used=false → email token → on use set used=true, update Account.password,
invalidate ALL user sessions.

After adding: npx prisma format && npx prisma validate. Show output.
```

### Step 4.7 — AuditLog model

```
Add the AuditLog model to prisma/schema.prisma. Records every important auth/account action.

model AuditLog {
  id         String   @id @default(cuid())
  userId     String?
  action     String
  ipAddress  String?
  userAgent  String?  @db.Text
  metadata   Json?
  status     String   @default("success")
  createdAt  DateTime @default(now())
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  @@index([userId]) @@index([action]) @@index([createdAt]) @@index([status])
  @@map("audit_logs")
}

Notes: userId nullable (failed logins have no valid userId);
actions: login_success/failed, logout, register, email_verified, password_reset_requested,
password_changed, 2fa_enabled/disabled/failed, session_revoked, account_banned, role_changed,
profile_updated, oauth_connected/disconnected; status success|failed|blocked;
metadata JSON for context; onDelete SetNull (keep log even if user deleted).

After adding: npx prisma format && npx prisma validate.
Show me the COMPLETE prisma/schema.prisma file with ALL 7 models.
```

### Step 4.8 — Push schema + generate + seed admin

```
Push the complete auth schema to MySQL and generate the Prisma client.

1. npx prisma db push (if errors: --force-reset; check DATABASE_URL; check MySQL perms). Show output.
2. npx prisma generate. Show output.
3. Verify tables — create prisma/verify-schema.ts:
   import { PrismaClient } from "@prisma/client"
   const prisma = new PrismaClient()
   async function main() {
     const tables = await prisma.$queryRaw`SHOW TABLES`
     console.log("Tables created:", tables)
     await prisma.$disconnect()
   }
   main()
   Run npx ts-node prisma/verify-schema.ts. Expect 7 tables:
   users, sessions, accounts, verifications, two_factors, password_resets, audit_logs
4. Create prisma/seed.ts — admin (admin@shop.com role admin emailVerified true) +
   customer (test@shop.com role customer emailVerified true); each with Account
   (provider credential, password bcrypt of "Password123!").
   package.json: "prisma": { "seed": "ts-node prisma/seed.ts" }. Run npx prisma db seed.
5. Final verify: npm run build, npm test. Fix TS errors from new Prisma types. Show passing output.
```

### Step 4.9 — Wire better-auth to Prisma schema

```
Connect better-auth to the Prisma schema. Update src/lib/auth.ts:

1. Imports: betterAuth, prismaAdapter (better-auth/adapters/prisma),
   twoFactor + admin plugins, prisma from "@/server/db"
2. export const auth = betterAuth({
     database: prismaAdapter(prisma, { provider: "mysql" }),
     emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128,
       requireEmailVerification: true, autoSignIn: false },
     session: { expiresIn: 60*60*24*7, updateAge: 60*60*24,
       cookieCache: { enabled: true, maxAge: 60*5 } },
     user: { additionalFields: {
       role: { type: "string", required: true, defaultValue: "customer", input: false },
       isActive: { type: "boolean", required: true, defaultValue: true, input: false },
       twoFactorEnabled: { type: "boolean", defaultValue: false, input: false } } },
     plugins: [
       twoFactor({ issuer: process.env.NEXT_PUBLIC_APP_NAME || "MyShop",
         otpOptions: { period: 30, digits: 6 } }),
       admin({ adminRole: ["admin"],
         bannedUserMessage: "Your account has been suspended. Contact support." }) ],
     trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
     secret: process.env.BETTER_AUTH_SECRET!,
     baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
   })
   export type Session = typeof auth.$Infer.Session
   export type User = typeof auth.$Infer.Session.user

3. Create src/server/db/index.ts — Prisma singleton with globalThis caching in dev,
   log query/error/warn in dev, error in prod.

Show me both complete files.
```

### Step 4.10 — Auth catch-all API route

```
Create the catch-all API route that hands all auth requests to better-auth.

Create src/app/api/auth/[...all]/route.ts:
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
export const { GET, POST } = toNextJsHandler(auth)

After creating: npm run dev, then curl http://localhost:3000/api/auth/session
(expect { "session": null } or a session). Show curl output.
If 404 → confirm path is exactly src/app/api/auth/[...all]/route.ts.
```

### Step 4.11 — Auth client + useAuth hook

```
Create the client-side better-auth instance.

1. src/lib/auth-client.ts:
   createAuthClient (better-auth/react) with baseURL NEXT_PUBLIC_APP_URL,
   plugins twoFactorClient (onTwoFactorRedirect → /auth/two-factor) + adminClient().
   Export signIn, signUp, signOut, useSession, twoFactor, admin as adminActions.

2. Update src/hooks/useAuth.ts ("use client"):
   useSession + signOut from auth-client; ROLES + Role from constants.
   logout() → signOut() → router.push("/auth/login") → router.refresh()
   Return { user, isLoading (isPending), isAuthenticated, role, isAdmin,
   isShopManager, isCustomer, isSupport, logout }.

Show me both complete files.
```

### Step 4.12 — Update middleware to use better-auth session

```
Update src/middleware.ts to read sessions from better-auth instead of manual JWT decode.

- Public routes (/, /products, /shop, /cart), auth routes (/auth/login, /auth/register),
  /api/auth → pass through with security headers
- Otherwise: getSessionFromRequest(req, auth)
  - no session → redirect /auth/login?redirect=pathname
  - !isActive → redirect /auth/banned
  - /admin/* and role != admin → /403
  - /shop-manager/* and role != shop_manager → /403
  - /support/* and role != support → /403
- addSecurityHeaders() helper (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection)
- config matcher excludes _next/static, _next/image, favicon, images

Show me the final middleware.ts.
```

### Step 4.13 — Server-side session helpers for layouts

```
Add shared server-side auth helpers to src/lib/auth.ts (used by all role layouts):

import { headers } from "next/headers"
getServerSession() → auth.api.getSession({ headers: await headers() })
requireAuth() → session or redirect("/auth/login")
requireRole(allowedRoles[]) → requireAuth then redirect("/403") if role not allowed
requireAdmin / requireShopManager / requireSupport / requireCustomer → requireRole wrappers

Then update each layout to one-line guard:
(admin)/layout.tsx → await requireAdmin()
(shop-manager)/layout.tsx → await requireShopManager()
(customer)/layout.tsx → await requireCustomer()
(support)/layout.tsx → await requireSupport()
Each returns <div data-layout="...">{children}</div>

Show me the updated auth.ts and all four layout files.
```

### Step 4.14 — AuditLog service + better-auth hooks

```
Create the AuditLog service that records every auth action.

Create src/server/services/audit-log.service.ts:
- type AuditAction (login_success, login_failed, logout, register, email_verified,
  password_reset_requested, password_changed, 2fa_enabled/disabled/failed,
  session_revoked, account_banned/unbanned, role_changed, profile_updated,
  oauth_connected/disconnected)
- type CreateAuditInput { userId?, action, ipAddress?, userAgent?, metadata?, status? }
- logAudit(data) — prisma.auditLog.create in try/catch, never throws, logger.error on fail
- getAuditLogs(filters { userId, action, status, from, to, page, limit }) — paginated, desc
- getRecentFailedLogins(email, minutes) — count for login rate limiting

Wire logAudit into better-auth hooks in src/lib/auth.ts (after sign-in/email):
log login_success/failed with userId, ipAddress (x-forwarded-for), userAgent, status.

Show me audit-log.service.ts and the updated auth.ts hooks section.
```

### Step 4.15 — Final build + test verify loop

```
Run the full verify and fix loop for the complete auth schema + better-auth wiring.

LOOP:
1. npx prisma validate → fix schema errors
2. npx prisma generate → confirm generated
3. npm run build → fix TS errors (imports, session/user types, use client/server, better-auth API)
4. npm test → add mocks to src/tests/setup.ts:
   vi.mock("@/lib/auth-client", () => ({ useSession: vi.fn(() => ({ data: null, isPending: false })),
     signIn: vi.fn(), signOut: vi.fn(), signUp: vi.fn() }))
   vi.mock("@/lib/auth", () => ({ getServerSession: vi.fn(() => null), requireAuth: vi.fn(),
     requireRole: vi.fn(), requireAdmin: vi.fn(), requireShopManager: vi.fn(),
     requireCustomer: vi.fn(), requireSupport: vi.fn() }))
5. Smoke test: curl -X POST .../api/auth/sign-up/email -d '{"name":"Test","email":"test2@test.com","password":"Password123!"}'
   (expect 200 + user); curl .../api/auth/session (expect null)
6. Checklist: prisma valid, 7 tables, catch-all responds, useAuth works, requireAdmin redirects,
   AuditLog writes on login, build clean, tests pass, lint clean.
```

---

## Phase 5 — Core API Routes

### Step 5.1 — Prisma ecommerce models

```
Add the core ecommerce models to prisma/schema.prisma (AFTER the auth models).

Add: Category (id, name unique, slug unique, description, image, parentId, isActive,
sortOrder; self-relation parent/children; products[]; @@map categories),
Product (id, name, slug unique, description LongText, price Decimal(10,2), comparePrice,
costPrice, sku unique, barcode, stock, lowStockAt, weight, categoryId, images Json, tags Json,
isActive, isFeatured; relations category/cartItems/orderItems/reviews; @@map products),
Address (id, userId, label, fullName, phone, line1, line2, city, state, postalCode,
country IN, isDefault; user relation; orders[]; @@map addresses),
Cart (id, userId unique, user, items[]; @@map carts),
CartItem (id, cartId, productId, quantity; cart/product relations; @@unique [cartId, productId]; @@map cart_items),
Order (id, orderNumber unique, userId, addressId, status pending, paymentStatus unpaid,
paymentMethod, paymentId, subtotal, tax, shipping, discount, total Decimal(10,2), notes;
relations user/address/items; @@map orders),
OrderItem (id, orderId, productId, name, price, quantity, total, image; order/product; @@map order_items),
Review (id, userId, productId, rating, title, body, isVisible; user/product; @@unique [userId, productId]; @@map reviews).

Also add to User model relations: addresses Address[], cart Cart?, orders Order[], reviews Review[]

Then: npx prisma format && npx prisma validate && npx prisma db push && npx prisma generate.
Show full output of all four commands.
```

### Step 5.2 — Products API (CRUD + pagination + filters)

```
Create the Products API with full CRUD, pagination, filtering, search.

1. src/server/services/product.service.ts: getProducts(filters page/limit/search/categoryId/
   minPrice/maxPrice/isFeatured/isActive/sortBy/sortOrder → { products, total, page, totalPages }),
   getProductBySlug, getProductById, createProduct (auto slug), updateProduct, deleteProduct
   (soft delete isActive false), getFeaturedProducts(limit), getLowStockProducts (stock <= lowStockAt)
2. src/server/validators/product.schema.ts: createProductSchema, updateProductSchema (partial),
   productQuerySchema (page 1, limit 20 max 100, sortBy price|name|createdAt|stock, sortOrder asc|desc)
3. src/app/api/products/route.ts: GET public getProducts; POST admin|shop_manager createProduct
4. src/app/api/products/[id]/route.ts: GET public; PUT admin|shop_manager; DELETE admin
5. src/app/api/products/featured/route.ts: GET public getFeaturedProducts(8)

All routes: requireAuth + role checks for protected; { data, message, success } shape;
withErrorHandler HOF; logAudit important actions.

Show me all 5 files with full implementation.
```

### Step 5.3 — Categories API (tree + CRUD)

```
Create the Categories API with parent-child tree structure.

1. src/server/services/category.service.ts: getCategories (flat active),
   getCategoryTree (nested children recursive), getCategoryBySlug (with product count),
   createCategory (auto slug), updateCategory, deleteCategory (only if no products)
2. src/server/validators/category.schema.ts: createCategorySchema (name required, slug/parentId/
   description optional), updateCategorySchema (all optional)
3. src/app/api/categories/route.ts: GET public getCategoryTree; POST admin createCategory
4. src/app/api/categories/[id]/route.ts: GET public; PUT admin; DELETE admin (400 if has products)

Show me all 4 files with full implementation.
```

### Step 5.4 — Cart API (add, update, remove, sync)

```
Create the Cart API. Server-side, tied to logged-in user.

1. src/server/services/cart.service.ts: getCart (get or create with items+product),
   addToCart (check active + stock, increment or create, return cart),
   updateCartItem (qty 0 removes, check stock), removeFromCart, clearCart,
   getCartTotal (subtotal from current prices), syncCartCount (item count for badge)
2. src/server/validators/cart.schema.ts: addToCartSchema { productId, quantity 1-99 },
   updateCartItemSchema { quantity 0-99 }
3. src/app/api/cart/route.ts: GET requireAuth getCart; DELETE clearCart
4. src/app/api/cart/items/route.ts: POST requireAuth addToCart { productId, quantity }
5. src/app/api/cart/items/[itemId]/route.ts: PATCH updateCartItem; DELETE removeFromCart
6. src/app/api/cart/count/route.ts: GET requireAuth syncCartCount (header badge)

Show me all 6 files with full implementation.
```

### Step 5.5 — Orders API (create, track, manage)

```
Create the Orders API.

1. src/server/services/order.service.ts:
   createOrder(userId, data) — orderNumber "ORD-" + nanoid(8).toUpperCase(),
   snapshot product name+price into OrderItem, calc subtotal+tax(18%)+total,
   clear cart, logAudit "order_placed", return order with items;
   getOrderById (verify ownership), getUserOrders (paginated),
   getAllOrders (admin filters status/paymentStatus/from/to/userId),
   updateOrderStatus (valid transitions pending→confirmed→processing→shipped→delivered,
   any→cancelled if not delivered, logAudit),
   getOrderStats { total, by status, revenue today/week/month }
2. src/server/validators/order.schema.ts: createOrderSchema { addressId, paymentMethod, notes? },
   updateOrderStatusSchema { status enum }, orderQuerySchema { page, limit, status, from, to }
3. src/app/api/orders/route.ts: GET requireAuth (customer getUserOrders, admin getAllOrders);
   POST requireAuth customer createOrder
4. src/app/api/orders/[id]/route.ts: GET requireAuth (own or admin); PATCH admin|shop_manager updateOrderStatus
5. src/app/api/orders/stats/route.ts: GET admin getOrderStats

Show me all 5 files with full implementation.
```

### Step 5.6 — Address + Reviews + Users API

```
Create three supporting API route groups.

ADDRESS (customer):
1. src/app/api/addresses/route.ts: GET own addresses; POST create (if isDefault, unset previous)
2. src/app/api/addresses/[id]/route.ts: PUT update own; DELETE own (block if used in order)

REVIEWS:
3. src/app/api/reviews/route.ts: GET public (productId, page, limit + avg rating + count);
   POST customer (block duplicate, optional: block if never ordered)
4. src/app/api/reviews/[id]/route.ts: DELETE (customer own, admin any)

USERS (admin):
5. src/app/api/users/route.ts: GET requireAdmin paginated (search, role, isActive, page, limit),
   no password hash
6. src/app/api/users/[id]/route.ts: GET requireAdmin (with audit summary);
   PATCH requireAdmin (role/isActive, logAudit role changes); DELETE soft delete

All: withErrorHandler, Zod on bodies, { data, message, success }.
Show me all 6 files with full implementation.
```

### Step 5.7 — Search API + admin stats API

```
Create the Search API and Admin Stats API.

SEARCH (public):
1. src/app/api/search/route.ts: GET (q, page, limit, categoryId, minPrice, maxPrice),
   Prisma contains insensitive on name/description/tags/sku, filter category + price,
   return { products, total, page, query }; empty if q < 2 chars; log query

ADMIN STATS (admin):
2. src/app/api/admin/stats/route.ts: GET requireAdmin →
   { users { total, newToday, newThisWeek }, products { total, active, lowStock, outOfStock },
   orders { total, by status, cancelledToday, revenue today/week/month/total },
   reviews { total, avgRating, pendingModeration }, recentOrders (5), topProducts (5) }
   Run all queries in parallel with Promise.all()
3. src/app/api/admin/stats/revenue/route.ts: GET requireAdmin (period 7d|30d|90d|1y),
   daily revenue [{ date, revenue, orders }] via groupBy date truncation

Show me all 3 files with full implementation.
```

### Step 5.8 — API test suite + verify loop

```
Write unit tests for service functions and run the full verify loop.

1. src/tests/unit/product.service.test.ts (mock @/server/db): getProducts paginated,
   filter categoryId, getProductBySlug null for unknown, createProduct generates slug,
   deleteProduct soft delete
2. src/tests/unit/cart.service.test.ts: addToCart creates/increments, throws on low stock,
   updateCartItem qty 0 removes, clearCart removes all
3. src/tests/unit/order.service.test.ts: createOrder ORD- prefix, snapshots price,
   clears cart, updateOrderStatus invalid transition throws, getOrderById ownership

LOOP: npx prisma validate → npm run build → npm test → npm run lint.
Smoke: curl /api/products, /api/search?q=shirt, /api/categories, /api/cart (with cookie).
Checklist: 8 models in MySQL, products CRUD, categories tree, cart, order create+status,
search, admin stats, tests pass, build/lint clean.
```

---

## Phase 6 — Storefront UI

### Step 6.1 — Storefront layout (header, footer, nav)

```
Build the storefront shell — layout, header, footer wrapping every public page.

1. src/app/(store)/layout.tsx — server component: StorefrontHeader + main{children} + StorefrontFooter, no auth
2. src/components/layout/StorefrontHeader.tsx ("use client"): logo, CategoryNav (desktop)/hamburger,
   SearchBar icon, cart icon with count badge (GET /api/cart/count), auth buttons
   (Login/Sign up OR avatar dropdown: My Orders, Profile, Logout via useAuth);
   mobile hamburger → Sheet; sticky shadow on scroll (useScrolled); shadcn NavigationMenu
3. src/components/layout/StorefrontFooter.tsx: 3-col grid (About, Shop, Help) + bottom bar (copyright, social)
4. src/components/layout/CategoryNav.tsx ("use client"): fetch /api/categories, horizontal top-level list,
   links /shop?category=slug, active highlight, skeleton loading
5. src/hooks/useScrolled.ts ("use client"): boolean isScrolled (scrollY > 10), scroll listener + cleanup

Show me all 5 files with full implementation.
```

### Step 6.2 — SearchBar + CartDrawer

```
Build SearchBar and CartDrawer.

1. src/components/shared/SearchBar.tsx ("use client"): expand input on click, debounced 400ms
   → /api/search?q=, dropdown results (image+name+price, max 6, link /products/slug),
   "See all results" → /products?search=, empty + loading states, Escape/click-outside closes, shadcn Popover
2. src/components/shared/CartDrawer.tsx ("use client"): shadcn Sheet from right, fetch /api/cart on open,
   item list (image, name, price, qty +/- controls, remove), bottom subtotal + View Cart + Checkout
   (→ /checkout, redirect login if not authed), empty + loading states, refresh header count after change
3. src/hooks/useCart.ts ("use client"): Zustand store { items, total, count, isLoading, isOpen },
   openCart/closeCart/refreshCart (fetch /api/cart) so header + drawer stay in sync

Show me all 3 files with full implementation.
```

### Step 6.3 — Home page (hero + featured)

```
Build the storefront home page. src/app/(store)/page.tsx — server component.

Sections: (1) Hero — gradient banner, heading, tagline, CTAs Shop Now /products + Browse /shop,
Next Image placeholder, generateMetadata SEO; (2) Category strip — fetch /api/categories, top 6 cards
→ /shop?category=slug; (3) Featured products — fetch /api/products/featured, grid 4/2/1, ProductCard,
View All link; (4) Promo banner — static "Free shipping above ₹999"; (5) Recently viewed ("use client")
— localStorage "recentlyViewed" slugs, fetch + horizontal ProductCards, skip if empty.

Rules: server fetch with cache tags, Suspense + skeletons per section, OrganizationJsonLd in root layout.
Show me the complete page.tsx with all sections.
```

### Step 6.4 — ProductCard + ProductGrid

```
Build reusable ProductCard and ProductGrid.

1. src/components/shared/ProductCard.tsx ("use client") props { product, showAddToCart? }:
   square Next Image (hover zoom), Sale badge if comparePrice>price, wishlist heart (localStorage),
   name (2-line truncate), price (compare struck + savings %), star rating + count,
   Add to Cart (POST /api/cart/items, spinner, success opens CartDrawer + notifySuccess,
   error notifyError, not logged in → /auth/login?redirect=back), card → /products/slug
2. src/components/shared/ProductGrid.tsx props { products, loading?, columns? 2|3|4 }:
   responsive grid, N skeletons when loading, empty state
3. src/components/shared/ProductCardSkeleton.tsx: matches layout, shadcn Skeleton
4. src/types/index.ts: Product, Category, CartItem, Order, PaginatedResponse<T>

Show me all 4 files with full implementation.
```

### Step 6.5 — Products listing page (filters + pagination)

```
Build the products listing page with filters, sorting, pagination.

1. src/app/(store)/products/page.tsx — server: read params (page, search, categoryId, minPrice,
   maxPrice, sortBy, sortOrder), fetch filtered, generateMetadata dynamic, sidebar filters + grid,
   mobile filters in Sheet, ProductGrid + Pagination
2. src/components/shared/ProductFilters.tsx ("use client") props { categories, currentFilters }:
   category checkboxes, price min/max, sort Select (Newest, Price asc/desc, Most reviewed),
   Clear all; each change → router.push new search params (no reload)
3. src/components/shared/ProductSort.tsx ("use client"): compact sort dropdown synced to URL
4. src/components/shared/Pagination.tsx props { page, totalPages, onPageChange }: shadcn Pagination,
   prev/next + numbers + ellipsis, updates ?page=
5. src/app/(store)/products/loading.tsx: filter skeleton + 12 ProductCardSkeleton

Show me all 5 files with full implementation.
```

### Step 6.6 — Product detail page (gallery, reviews, SEO)

```
Build the product detail page with gallery, reviews, full SEO.

1. src/app/(store)/products/[slug]/page.tsx — server: fetch by slug (notFound if missing),
   generateMetadata from product, generateStaticParams (top 100), two-col gallery + info,
   below: Reviews + Related. Right col: breadcrumb, name h1, rating, price+savings, description,
   stock indicator (>10 In stock green / 1-10 Only X left amber / 0 Out of stock red disable),
   qty selector, Add to Cart, Buy Now (add + /checkout), meta (SKU, category, tags)
2. src/components/shared/ProductImageGallery.tsx ("use client") props { images, name }:
   main image, thumbnail strip (click to switch), hover zoom, fallback placeholder
3. src/components/shared/ProductReviews.tsx ("use client") props { productId, avgRating, totalReviews }:
   fetch /api/reviews, rating breakdown bars, review cards, Write a review Dialog (rating, title, body,
   POST /api/reviews, login required)
4. ProductJsonLd on page (name, description, image, price, availability)
5. src/app/(store)/products/[slug]/loading.tsx: detail skeleton

Show me all 5 files with full implementation.
```

### Step 6.7 — Shop page + Cart page

```
Build the Shop (category browse) page and the Cart page.

SHOP:
1. src/app/(store)/shop/page.tsx — server: fetch categories with product counts,
   generateMetadata, heading, category grid 3/2, each card (image/gradient, name, "24 products",
   subcategory list, → /products?categoryId=id); if ?category=slug show name+description+filtered grid

CART:
2. src/app/(store)/cart/page.tsx ("use client"): fetch /api/cart (useCart), two cols
   (items 2/3 + summary 1/3). Items: heading "Shopping Cart (X)", rows (image, name → /products/slug,
   unit price, qty stepper, line total, remove), Continue Shopping, Clear Cart (confirm).
   Summary (sticky): subtotal, shipping (Free if >₹999 else ₹99), tax 18%, total,
   Proceed to Checkout (logged in → /checkout, else /auth/login?redirect=/checkout), coupon input (UI only)
3. src/app/(store)/cart/loading.tsx: cart skeleton

Show me all 3 files with full implementation.
```

### Step 6.8 — Storefront verify + SEO check + test loop

```
Run the full verify loop for the storefront, check SEO, confirm pages render.

LOOP:
1. npm run build — fix: missing "use client", Image width/height, server calling client hooks,
   missing Suspense
2. npm test — add ProductCard.test.tsx (name+price, Sale badge, add to cart POST, loading) +
   SearchBar.test.tsx (icon, expand, debounce 400ms, results dropdown)
3. npm run test:e2e — storefront.spec.ts: / hero, /products grid, /cart heading, /shop cards
4. SEO: curl /sitemap.xml (product URLs), /robots.txt (Disallow /admin/*),
   view /products/[slug] source (JSON-LD + og:image)
5. Performance: npx next build, no page > 200kb JS (lazy-load heavy components)
6. Checklist: home, products+filters, detail+reviews, shop, cart, add to cart, search dropdown,
   cart drawer, mobile menu, sitemap, JSON-LD, build/tests clean.
```

---

## Phase 7 — Customer Area + Checkout

> Payment: **Razorpay** (INR, UPI/cards/netbanking) with **COD** fallback. Swap to Stripe if needed.

### Step 7.1 — Checkout shell (wizard + address step)

```
Build checkout as a 3-step wizard. The (customer) layout guard already redirects unauthenticated users.

1. src/app/(customer)/checkout/page.tsx ("use client"): step state address|payment|review,
   step indicator, left current step + right sticky summary, fetch /api/cart on mount
   (empty → redirect /cart + notifyWarning), persist via useCheckout store + sessionStorage
2. src/hooks/useCheckout.ts — Zustand: { step, selectedAddressId, paymentMethod, notes, cart,
   isProcessing }; setStep/setAddress/setPaymentMethod/setNotes/reset
3. src/components/checkout/CheckoutSteps.tsx ("use client") props { currentStep }:
   3-step indicator, clickable back to completed only
4. src/components/checkout/AddressStep.tsx ("use client"): fetch /api/addresses, selectable
   radio cards (label, name, address, phone, Default badge), Add new → AddressForm Dialog,
   select → store + enable Continue, Continue to Payment, empty state
5. src/components/checkout/AddressForm.tsx ("use client"): react-hook-form + zod
   (label, fullName, phone, line1, line2, city, state, postalCode, country, set default),
   POST /api/addresses → refresh + select (reused in profile)

Show me all 5 files with full implementation.
```

### Step 7.2 — Payment step + Razorpay integration

```
Build the payment step with Razorpay (INR) + COD fallback. # npm install razorpay

1. src/lib/razorpay.ts — server client (key_id/key_secret from env);
   createRazorpayOrder(amount, receipt) → paise (×100), currency INR, returns { orderId, amount, currency };
   verifyPaymentSignature(orderId, paymentId, signature) → crypto HMAC SHA256, boolean
2. src/app/api/checkout/create-order/route.ts — POST requireAuth customer { addressId, paymentMethod, notes }:
   fetch cart (not empty), validate stock, calc totals (subtotal+tax18%+shipping);
   razorpay → create order return { razorpayOrderId, amount, key_id };
   cod → create DB order paymentStatus unpaid, clear cart, return { orderId, orderNumber }
3. src/app/api/checkout/verify-payment/route.ts — POST requireAuth customer
   { razorpayOrderId, razorpayPaymentId, signature, addressId, notes }:
   verifyPaymentSignature; invalid → 400 + logAudit payment_failed;
   valid → create DB order paymentStatus paid + paymentId, clear cart, logAudit payment_success,
   return { orderId, orderNumber }
4. src/components/checkout/PaymentStep.tsx ("use client"): RadioGroup Razorpay/COD, Continue to Review
5. .env.local: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, NEXT_PUBLIC_RAZORPAY_KEY_ID

Show me all files with full implementation.
```

### Step 7.3 — Review step + place order + Razorpay checkout

```
Build the final review step that places the order and launches Razorpay.

1. src/components/checkout/ReviewStep.tsx ("use client"): summary (address+edit, payment+edit,
   items, notes textarea, totals), Place Order — COD: POST create-order → /orders/[id]?success=true;
   Razorpay: POST create-order → launch modal; loading overlay; errors keep user on review
2. src/components/checkout/RazorpayCheckout.tsx ("use client"): dynamically load
   checkout.razorpay.com/v1/checkout.js; openRazorpay({ orderId, amount, keyId, onSuccess, onError })
   → new window.Razorpay({ key, amount, currency INR, order_id, name, description,
   handler → verify payment then onSuccess, prefill name+email, theme }); dismiss → onError("cancelled");
   handler POST verify-payment → verified → /orders/[id]?success=true
3. src/lib/load-script.ts — loadScript(src): Promise<boolean>, inject tag, skip if loaded
4. src/types/razorpay.d.ts — declare global Window.Razorpay

Show me all 4 files with full implementation.
```

### Step 7.4 — Order confirmation + payment webhook

```
Build order confirmation page and Razorpay webhook for reliable payment status.

1. src/app/(customer)/orders/[id]/page.tsx — server: fetch order (verify ownership);
   ?success=true → success banner + order number; details (status timeline stepper, items,
   address, payment status badge, breakdown); Download Invoice (TODO); Track/Contact Support;
   notFound if not owned
2. src/components/orders/OrderStatusTimeline.tsx ("use client") props { status, createdAt, updatedAt }:
   5-stage stepper (completed green check, current pulsing, future grey), cancelled red, vertical on mobile
3. src/app/api/webhooks/razorpay/route.ts — POST no auth but verify X-Razorpay-Signature:
   payment.captured → paid, payment.failed → failed, order.paid → confirmed; idempotent;
   return 200 fast; log all events
4. .env.local: RAZORPAY_WEBHOOK_SECRET
5. Explain registering webhook URL in Razorpay dashboard (events: payment.captured/failed, order.paid)

Show me all files + the webhook setup explanation.
```

### Step 7.5 — Order history list page

```
Build the order history page.

1. src/app/(customer)/orders/page.tsx — server: fetch GET /api/orders paginated, generateMetadata,
   read ?status= ?page=, heading, status tabs (All/Active/Delivered/Cancelled), OrderCard list,
   Pagination (reuse), empty state
2. src/components/orders/OrderCard.tsx ("use client") props { order }: order# + date, status badge,
   first 3 thumbnails + "+N more", total, payment badge, View Details → /orders/[id],
   Reorder (POST /api/cart/items each, open drawer), Cancel (if allowed, confirm → PATCH cancelled)
3. src/components/orders/OrderStatusBadge.tsx props { status }: shadcn Badge color per status
   (pending gray, confirmed blue, processing amber, shipped purple, delivered green, cancelled red) — reusable
4. src/app/(customer)/orders/loading.tsx: order list skeleton

Show me all 4 files with full implementation.
```

### Step 7.6 — Profile page + address book + security

```
Build the customer profile page (tabs: Profile, Addresses, Security).

1. src/app/(customer)/profile/page.tsx ("use client"): shadcn Tabs, useAuth for user
2. src/components/profile/ProfileTab.tsx ("use client"): form name, email (read-only), phone,
   avatar upload + preview, react-hook-form + zod, save PATCH /api/users/me, notifySuccess
3. src/components/profile/AddressesTab.tsx ("use client"): address cards (edit AddressForm dialog reuse,
   delete confirm, set default), Add new, /api/addresses endpoints
4. src/components/profile/SecurityTab.tsx ("use client"): change password (current/new/confirm →
   better-auth changePassword); 2FA (status, Enable → QR + backup codes, Disable + password confirm);
   active sessions (/api/users/me/sessions, device/IP/last active, Revoke per session,
   Log out all other devices)
5. src/app/api/users/me/route.ts: GET own profile; PATCH own name/phone/image only (NOT role/email)
6. src/app/api/users/me/sessions/route.ts: GET own sessions; DELETE revoke by id { sessionId }

Show me all files with full implementation.
```

### Step 7.7 — Checkout e2e tests + payment test mode + verify loop

```
Test the checkout flow using Razorpay test mode, then run the verify loop.

1. Razorpay test mode: TEST keys (rzp_test_), card 4111 1111 1111 1111 any future expiry/CVV,
   UPI success@razorpay; document in src/lib/razorpay.ts comment
2. src/tests/unit/checkout.service.test.ts: createRazorpayOrder ×100 paise, verifyPaymentSignature
   false for tampered + true for valid, total = subtotal + 18% tax + shipping
3. src/tests/e2e/checkout.spec.ts: login test@shop.com, add product, /checkout, Address current,
   select + Continue, Payment, COD + Continue, Review summary, Place Order, redirect /orders/[id] success banner
4. LOOP: npm run build (fix window.Razorpay typing) → npm test → npm run test:e2e → npm run lint;
   add vi.mock("razorpay", () => ({ default: vi.fn() })) to setup
5. Smoke checklist: empty cart redirect, address add+select, payment methods, review totals,
   COD order, Razorpay test card verify, order in /orders, status timeline, profile update/password/2FA/sessions,
   build/tests clean.
```

---

## Seeder — Populate the Database

> Run this BEFORE Phase 8 so the admin dashboard has real data. Seeds ~60 products, 25 users, 150+ reviews, 40 orders, and more.

```
Create a complete database seeder. You know the full Prisma schema — all auth models
(User, Session, Account, Verification, TwoFactor, PasswordReset, AuditLog) and ecommerce models
(Category, Product, Address, Cart, CartItem, Order, OrderItem, Review).

# npm install -D @faker-js/faker

Create prisma/seed.ts seeding ALL tables in correct dependency order in one run.
Use @faker-js/faker (faker.seed(123) for reproducibility) and bcryptjs.

ORDER:
1. CLEAN (reverse dep order): reviews, orderItems, orders, cartItems, carts, addresses,
   products, categories, auditLogs, twoFactors, passwordResets, sessions, accounts, users.
   try/catch, log each.
2. USERS (25): 1 admin (admin@shop.com), 2 shop managers, 1 support, 21 customers (faker).
   Each gets Account (provider credential, password bcrypt "Password123!").
   80% emailVerified true; 2 customers isActive false with bannedReason.
3. CATEGORIES (8 with hierarchy): Electronics→Smartphones,Laptops; Fashion→Men's,Women's;
   Home & Kitchen; Books. slug kebab-case, image https://placehold.co/400x400?text=Name.
4. PRODUCTS (60): ~10 per leaf category. Realistic name/price per category
   (Smartphones 8000-80000, Laptops 30000-150000, Fashion 500-5000, Home 300-10000, Books 150-1500),
   30% comparePrice, costPrice ×0.6, sku SKU-XXXXXXXX, stock 0-100 (5 zero, 5 low 1-5),
   images JSON 3 placeholders, tags JSON 2-4, 90% active, 12 featured.
5. ADDRESSES (30): distribute among customers, Indian addresses (+91 phone, states, 6-digit PIN),
   one default per user.
6. REVIEWS (150+): 0-6 per product from random customers (respect @@unique [userId, productId]),
   rating 1-5 weighted high, createdAt across 6 months.
7. ORDERS (40): random customers, 1-5 products (snapshot name+price), status distribution
   (30% delivered, 20% shipped, 20% processing, 15% confirmed, 10% pending, 5% cancelled),
   paymentStatus matched, 60% razorpay/40% cod, totals correct, createdAt across 3 months.
8. CARTS (20): 20 customers, 1-4 items (respect @@unique [cartId, productId]).
9. AUDIT LOGS (100+): login_success/failed, register, order_placed, password_changed,
   profile_updated, role_changed; random IPs/userAgents, last 30 days, some failed.

REQUIREMENTS: log progress per table, print final summary + login credentials,
main() with prisma.$disconnect(), idempotent, createMany where possible (individual where relations need id).

Then confirm package.json prisma.seed, run npx prisma db seed, show full output.
If FK errors: fix order and re-run.
NOTE: if placehold.co is blocked on your network, use picsum.photos or local placeholders.
```

---

## Phase 8 — Admin Dashboard

> Reuses: stats API (5.7), error log viewer (H.4), health endpoint (E), OrderStatusBadge + OrderStatusTimeline (Phase 7).

### Step 8.1 — Admin shell (sidebar, topbar, layout)

```
Build the admin dashboard shell. The (admin) layout guard with requireAdmin() already exists.

1. Update src/app/(admin)/layout.tsx: keep requireAdmin(), render AdminSidebar +
   (AdminTopbar + main), fixed collapsible sidebar left, pass user to topbar
2. src/components/admin/AdminSidebar.tsx ("use client"): collapsible (full/icon), nav with lucide icons —
   Overview, Products, Categories, Orders (pending badge), Users, Reviews (pending badge),
   Error Logs (unresolved badge), Site Health; active highlight (usePathname); badges from /api/admin/stats;
   collapse state in Zustand; mobile → Sheet
2b. src/hooks/useSidebar.ts — Zustand { isCollapsed, isMobileOpen }; toggleCollapse/openMobile/closeMobile
3. src/components/admin/AdminTopbar.tsx ("use client"): mobile hamburger + breadcrumb (from pathname);
   search, notifications, theme toggle, user menu (name, role badge, View store, logout)
4. src/components/admin/DashboardShell.tsx: props { title, description, action? }, heading + action button,
   consistent padding/max-width
5. src/components/admin/DataTable.tsx ("use client"): GENERIC <T> reusable (products/orders/users/reviews),
   props { columns, data, isLoading, pagination, onPageChange, onSort, searchPlaceholder, onSearch };
   shadcn Table; sorting, search, skeleton rows, empty state, pagination footer, row actions slot

Show me all files with full implementation.
```

### Step 8.2 — Overview page (stats cards + revenue charts)

```
Build the admin overview page using /api/admin/stats + /api/admin/stats/revenue (Phase 5). # npm install recharts

1. src/app/(admin)/dashboard/page.tsx — server: fetch stats, DashboardShell "Dashboard".
   A) 4 stat cards: Revenue (month) +%, Orders + pending, Products + low stock, Customers + new week
   (icon, number, sublabel, trend arrow). B) RevenueChart (area, 30d default, 7d/30d/90d/1y toggle).
   C) two cols: Recent Orders table (last 5: order#, customer, total, status, date, View all) +
   Top Products (top 5: image, name, units, revenue). D) OrderStatusChart (donut by status).
2. src/components/admin/StatCard.tsx ("use client") props { title, value, icon, trend?, trendLabel?, accent? }:
   positive green up / negative red down
3. src/components/admin/RevenueChart.tsx ("use client"): fetch /api/admin/stats/revenue?period=,
   recharts AreaChart responsive, period toggle, tooltip date+revenue+orders, loading skeleton
4. src/components/admin/OrderStatusChart.tsx ("use client"): recharts donut PieChart, colors match
   OrderStatusBadge, legend with counts

Show me all 4 files with full implementation.
```

### Step 8.3 — Product management (list + create/edit form)

```
Build product management. Uses Products API (Phase 5) + generic DataTable (8.1).

1. src/app/(admin)/dashboard/products/page.tsx ("use client"): DashboardShell "Products",
   action Add Product → /products/new. DataTable columns: checkbox, image thumb, name, SKU, category,
   price, stock (red 0 / amber <=lowStockAt / plain), status toggle (PUT isActive), actions
   (Edit → /products/[id]/edit, Delete confirm); bulk actions (delete, activate); search + category filter +
   pagination; fetch /api/products with admin filters (include inactive)
2. src/app/(admin)/dashboard/products/new/page.tsx: ProductForm create mode
3. src/app/(admin)/dashboard/products/[id]/edit/page.tsx — server: fetch product, ProductForm edit mode
4. src/components/admin/ProductForm.tsx ("use client") props { initialData?, mode }: react-hook-form + zod
   (reuse Phase 5 schema); Basic (name, slug auto, description), Pricing (price, comparePrice, costPrice),
   Inventory (sku, barcode, stock, lowStockAt), Organization (category select, tags, isActive, isFeatured),
   Images (ProductImageUploader); create POST / edit PUT; notifySuccess + redirect; inline errors
5. src/components/admin/ProductImageUploader.tsx ("use client"): add by URL/upload, preview grid
   drag-reorder + remove, first = primary, stores URL array

Show me all 5 files with full implementation.
```

### Step 8.4 — Order management (list + detail + status update)

```
Build order management. Uses Orders API (Phase 5), reuses OrderStatusBadge + OrderStatusTimeline (Phase 7).

1. src/app/(admin)/dashboard/orders/page.tsx ("use client"): DashboardShell "Orders".
   DataTable: order#, customer name+email, items count, total, payment badge, status badge, date, actions;
   filter tabs (All/Pending/Processing/Shipped/Delivered/Cancelled), payment filter, date range,
   search order#/email, row → /orders/[id], fetch /api/orders (admin), Export CSV (client-side)
2. src/app/(admin)/dashboard/orders/[id]/page.tsx — server: fetch any order, left items+customer+address,
   right status panel (reuse OrderStatusTimeline), customer card (name, email, phone, total orders),
   print invoice (window.print + print CSS)
3. src/components/admin/OrderStatusManager.tsx ("use client") props { orderId, currentStatus }:
   Select valid next statuses only, confirm before cancelled, PATCH /api/orders/[id],
   notifySuccess + refresh, optimistic update
4. src/lib/export-csv.ts: exportToCsv(filename, rows) — objects → CSV, Blob download, escape commas/quotes

Show me all 4 files with full implementation.
```

### Step 8.5 — User management (roles, ban, audit history)

```
Build user management. Uses Users API (Phase 5). Change roles, ban/unban, view audit history.

1. src/app/(admin)/dashboard/users/page.tsx ("use client"): DashboardShell "Users".
   DataTable: avatar+name, email, role badge, status (active/banned), email verified check,
   orders count, joined date, actions; filter by role + status; search name/email;
   row actions View/Change role/Ban-Unban; fetch /api/users
2. src/app/(admin)/dashboard/users/[id]/page.tsx — server: fetch user + audit summary (GET /api/users/[id]);
   cards profile, role+status management, stats (total orders, total spent, reviews, member since);
   recent audit table (last 20: action, status, IP, date)
3. src/components/admin/UserRoleManager.tsx ("use client") props { userId, currentRole, isActive }:
   role dropdown + Update Role (PATCH, confirm when promoting to admin); ban toggle (Ban → reason dialog →
   PATCH isActive false + bannedReason; Unban → PATCH isActive true); cannot change own (disable if self);
   all logged via logAudit

Show me all 3 files with full implementation.
```

### Step 8.6 — Review moderation + Categories management

```
Build review moderation and category management.

REVIEWS:
1. src/app/(admin)/dashboard/reviews/page.tsx ("use client"): DashboardShell "Reviews".
   DataTable: product (image+name), customer, rating stars, title+body preview, visible toggle, date, actions;
   filter All/Visible/Hidden + by rating; search product/content; visible toggle inline
   (PATCH /api/reviews/[id] { isVisible } — add handler if missing); actions View dialog/Hide-Show/Delete

CATEGORIES:
2. src/app/(admin)/dashboard/categories/page.tsx ("use client"): DashboardShell "Categories",
   action Add Category. Tree view (parent → children, reuse GET /api/categories); each node:
   name, slug, product count, active toggle, edit, delete; reorder via up/down (sortOrder);
   delete blocked if has products (error toast)
3. src/components/admin/CategoryForm.tsx ("use client"): Dialog form name, slug auto, description,
   parent select, image URL, isActive, sortOrder; create POST / edit PUT;
   parent select excludes self + own children (prevent cycles)

Show me all 3 files with full implementation.
```

### Step 8.7 — Site health page + final verify loop

```
Build the admin site health page and run the full Phase 8 verify loop.

1. src/app/(admin)/dashboard/health/page.tsx ("use client"): DashboardShell "Site Health".
   Poll GET /api/health every 30s; status banner (green operational / amber degraded / red down);
   cards Database (status + response time), Memory (used/total progress bar), Uptime (Xd Xh Xm),
   App version (package.json); recent errors widget (last 5 from /api/admin/error-logs, View all);
   web vitals summary (CLS, LCP, FCP); Refresh now button.
   (Error Logs page already exists from H.4 — confirm sidebar link works at /admin/dashboard/error-logs.)

2. LOOP:
   1. npm run build — fix TS (recharts types, generic DataTable<T>)
   2. npm test — add: StatCard renders value+trend; DataTable rows/empty/pagination;
      OrderStatusManager valid next statuses only
   3. npm run test:e2e — admin smoke: login admin@shop.com, /admin/dashboard stat cards,
      /products table rows, /orders table rows, non-admin → /403
   4. npm run lint — fix

3. Checklist: sidebar+topbar+collapse, overview cards+chart+recent, products CRUD+stock,
   orders list+filter+detail+status, users role+ban+audit, reviews moderation, categories tree CRUD,
   health live status, error logs reachable, non-admin redirected, build/tests clean.
```

---

## Phase 9 — Shop Manager Dashboard

> Operational, not administrative. **New this phase:** a `StockMovement` ledger + a fulfillment workflow. **Reuses:** `DashboardShell`, `DataTable`, `StatCard`, `ProductForm` from Phase 8. The shop manager can NOT manage users, roles, error logs, or delete data.

### Step 9.1 — Shop manager shell (sidebar, topbar, dashboard)

```
Build the shop manager dashboard shell. The (shop-manager) layout guard with requireShopManager()
already exists from Phase 4. REUSE DashboardShell, DataTable, StatCard from Phase 8 — do not rebuild.

1. Update src/app/(shop-manager)/layout.tsx: keep requireShopManager(), render
   ManagerSidebar + (ManagerTopbar + main), same collapsible structure as admin but narrower nav
2. src/components/manager/ManagerSidebar.tsx ("use client"): nav ONLY for Overview,
   Inventory (low stock badge), Products, Orders to Fulfill (pending badge), Low Stock (badge);
   NO Users/Roles/Error Logs/Categories-delete; active highlight; reuse useSidebar store; mobile Sheet
3. src/components/manager/ManagerTopbar.tsx ("use client"): breadcrumb, search,
   user menu (name, "Shop Manager" badge, View store, logout); no notifications center
4. src/app/api/manager/stats/route.ts — GET requireShopManager, parallel queries:
   { lowStockCount, outOfStockCount, ordersToFulfill, shippedToday, unitsSoldToday, topMovingProducts(5) }
5. src/app/(shop-manager)/dashboard/page.tsx — server: DashboardShell "Operations",
   reuse StatCard (Orders to Fulfill, Low Stock, Out of Stock, Units Shipped Today),
   "Needs attention" panel (low/out stock + quick restock; oldest unfulfilled orders)

Show me all files with full implementation.
```

### Step 9.2 — StockMovement model + inventory service (NEW)

```
Add a StockMovement ledger so every stock change is tracked with reason + who. Phase 5 only had a plain stock integer.

1. Add to prisma/schema.prisma:
model StockMovement {
  id String @id @default(cuid())
  productId String
  userId String?
  type String
  quantity Int
  stockBefore Int
  stockAfter Int
  reason String? @db.Text
  reference String?
  createdAt DateTime @default(now())
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)
  @@index([productId]) @@index([type]) @@index([createdAt])
  @@map("stock_movements")
}
Add relations: Product → stockMovements StockMovement[]; User → stockMovements StockMovement[]
type: restock(+), sale(-), return(+), damage(-), correction(±); reference = order/PO number;
stockBefore/stockAfter = full audit snapshot.

2. npx prisma format && npx prisma validate && npx prisma db push && npx prisma generate

3. src/server/services/inventory.service.ts:
   adjustStock(productId, type, quantity, userId, reason?, reference?) — in $transaction:
     read stockBefore, compute stockAfter (block negative for sale/damage), update product.stock,
     create StockMovement; return { product, movement }
   recordSale(productId, qty, orderNumber, userId) — wraps adjustStock type "sale"
   getStockHistory(productId, filters) — paginated; getLowStockProducts (0 < stock <= lowStockAt);
   getOutOfStockProducts (stock = 0); bulkRestock(items[], userId, reference?) — one transaction

4. Update order.service.createOrder to call recordSale() per item (sales hit the ledger, not direct).

Show me the schema additions, inventory.service.ts, and the order.service.ts change.
```

### Step 9.3 — Inventory management page + stock ledger UI (NEW)

```
Build the inventory management page (adjust stock + view movement ledger).

1. src/app/api/manager/inventory/route.ts: GET requireShopManager paginated products + current
   stock + last movement (filters search, stockStatus all/low/out/in, page, limit);
   POST requireShopManager single adjustment { productId, type, quantity, reason } → adjustStock
2. src/app/api/manager/inventory/[productId]/history/route.ts: GET getStockHistory paginated
3. src/app/api/manager/inventory/bulk-restock/route.ts: POST { items:[{productId,quantity}], reference } → bulkRestock
4. src/app/(shop-manager)/dashboard/inventory/page.tsx ("use client"): DashboardShell "Inventory",
   reuse DataTable (image, name, SKU, stock color badge red0/amber<=low/green, lowStockAt, last movement,
   actions), stock status filter, row Adjust → StockAdjustDialog, History → StockHistoryDialog,
   toolbar Bulk Restock → BulkRestockDialog
5. src/components/manager/StockAdjustDialog.tsx ("use client") { product, onDone }: current stock,
   type select (restock/correction/damage/return), qty +/-, reason (required damage/correction),
   live "New stock will be: X", POST → notifySuccess → onDone
6. src/components/manager/StockHistoryDialog.tsx ("use client") { productId }: type badge,
   +/- qty green/red, stockBefore→stockAfter, reason, reference, who, when
7. src/components/manager/BulkRestockDialog.tsx ("use client"): multiple product rows (search + qty),
   reference (PO), submit one POST bulk-restock

Show me all 7 files with full implementation.
```

### Step 9.4 — Order fulfillment workflow (NEW)

```
Build the fulfillment workflow — picking, packing, shipping. Distinct from admin's order management:
a queue-driven operational tool, not a full editor.

1. src/app/api/manager/fulfillment/route.ts: GET requireShopManager orders needing action
   (pending/confirmed/processing), oldest first, paginated, with items + address + customer
2. src/app/api/manager/fulfillment/[id]/route.ts: PATCH requireShopManager
   { action: confirm|start_packing|mark_shipped, trackingNumber? } →
   status confirmed/processing/shipped (mark_shipped requires trackingNumber);
   add Order.trackingNumber String? field (show schema change + db push); logAudit "order_fulfilled"
3. src/app/(shop-manager)/dashboard/fulfillment/page.tsx ("use client"): DashboardShell
   "Orders to Fulfill", 3-column board To Confirm→To Pack→To Ship, each card (order#, customer,
   item count, age, primary advance button), click → FulfillmentPanel
4. src/components/manager/FulfillmentPanel.tsx ("use client") { orderId }: pick list (image, name,
   SKU, qty, picked checkbox), address, Print Packing Slip, stage action button
   (pending→Confirm, confirmed→Mark Packed, processing→Mark Shipped w/ tracking input) → PATCH → refresh
5. src/components/manager/PackingSlip.tsx ("use client"): print-optimized (@media print),
   order#, date, customer, address, item table NO prices, barcode placeholder

Show me all files with full implementation, including the Order trackingNumber schema change.
```

### Step 9.5 — Low stock alerts + product edit (scoped)

```
Build low stock alerts and a scoped product editor.

LOW STOCK:
1. src/app/(shop-manager)/dashboard/low-stock/page.tsx ("use client"): DashboardShell
   "Low Stock Alerts"; Out of Stock (stock=0, red, top) + Low Stock (0<stock<=lowStockAt, amber);
   each row image, name, SKU, stock, threshold, units sold last 30d (from StockMovement sale),
   Restock quick button → StockAdjustDialog preset restock; Restock All → BulkRestockDialog prefilled

SCOPED PRODUCTS:
2. src/app/(shop-manager)/dashboard/products/page.tsx ("use client"): reuse admin products
   DataTable pattern BUT no delete (managers don't delete); can edit + toggle active;
   columns image, name, SKU, category, price, stock badge, active toggle, Edit
3. src/app/(shop-manager)/dashboard/products/[id]/edit/page.tsx — server: reuse ProductForm
   (Phase 8) edit mode with hideDangerZone prop; requireShopManager via layout

Note: products API already allows shop_manager for PUT (5.2); confirm role check includes
shop_manager and DELETE stays admin-only.

Show me all files with full implementation.
```

### Step 9.6 — Tests + final verify loop

```
Test inventory + fulfillment and run the full Phase 9 verify loop.

1. src/tests/unit/inventory.service.test.ts (mock @/server/db): adjustStock computes stockAfter
   (restock adds/sale subtracts), blocks negative (throws), writes before+after snapshot;
   recordSale → negative sale movement; bulkRestock one transaction; getLowStockProducts range
2. src/tests/unit/fulfillment.test.ts: confirm pending→confirmed, start_packing confirmed→processing,
   mark_shipped requires trackingNumber (throws without), mark_shipped processing→shipped
3. src/tests/e2e/shop-manager.spec.ts: login manager1@shop.com, /shop-manager/dashboard stat cards,
   /inventory rows + stock badges, Adjust dialog restock increases stock, /fulfillment order cards,
   customer visiting /shop-manager → /403
4. LOOP: npx prisma validate (StockMovement + Order.trackingNumber) → npm run build → npm test →
   npm run test:e2e → npm run lint
5. Checklist: StockMovement created + sales decrement through ledger; manager sidebar operational-only;
   inventory adjust+history+bulk restock; low/out stock populate from seeded edge cases;
   fulfillment confirm→pack→ship; packing slip no prices; manager edits but NOT deletes products;
   customer → /403; build/tests clean.
```

---

## Support Role — Lookup & Assistance Dashboard

> The 4th role, scaffolded in Phase 1. Deliberately read-mostly: look up orders/customers, add notes, cancel within limits, resend confirmations. **New:** a `SupportNote` model. **Reuses:** `DashboardShell`, `DataTable`, `StatCard`, `OrderStatusBadge`, `OrderStatusTimeline`. Cannot change roles, ban, edit profiles, manage inventory, or delete.

### Step SP.1 — Support shell + dashboard queue

```
Build the support dashboard shell. The (support) layout guard with requireSupport() already exists
from Phase 4. REUSE DashboardShell, DataTable, StatCard, OrderStatusBadge — do not rebuild.

1. Update src/app/(support)/layout.tsx: keep requireSupport(), render SupportSidebar + (SupportTopbar + main)
2. src/components/support/SupportSidebar.tsx ("use client"): nav ONLY Overview, Order Lookup,
   Customer Lookup, Product Lookup; NO inventory/fulfillment/users/roles/delete/error logs;
   reuse useSidebar; active highlight; mobile Sheet
3. src/components/support/SupportTopbar.tsx ("use client"): breadcrumb, global search
   (orders + customers), user menu (name, "Support" badge, logout)
4. src/app/api/support/stats/route.ts — GET requireSupport parallel:
   { ordersToday, openIssuesEstimate (pending+processing), recentOrders(10) }
5. src/app/(support)/dashboard/page.tsx — server: DashboardShell "Support",
   reuse StatCard (Orders Today, Awaiting Fulfillment, Shipped Today),
   recent orders table (last 10) + quick View, prominent global search bar

Show me all files with full implementation.
```

### Step SP.2 — Customer lookup (read-only)

```
Build customer lookup — find a customer, see everything to help them, strictly read-only.

1. src/app/api/support/customers/route.ts — GET requireSupport: search name/email/phone,
   paginated, safe fields only (no password, no 2FA secret)
2. src/app/api/support/customers/[id]/route.ts — GET requireSupport: profile, addresses,
   order count, total spent, last 10 orders, review count; READ-ONLY (no PATCH/DELETE)
3. src/app/(support)/dashboard/customers/page.tsx ("use client"): DashboardShell
   "Customer Lookup", search + DataTable (name, email, phone, orders, joined, View), row → detail
4. src/app/(support)/dashboard/customers/[id]/page.tsx — server: profile card (read-only,
   no edit buttons), addresses (read-only), orders table → order detail, stats
   (total orders, total spent, member since), Copy customer email button

Support sees data but cannot modify — no role change, ban, or profile edit. Show read-only badges.
Show me all 4 files with full implementation.
```

### Step SP.3 — Order assistance (notes, cancel, resend)

```
Build order lookup + limited actions support can take on a customer's behalf.

1. src/app/api/support/orders/route.ts — GET requireSupport: search order#/email, filter status, paginated
2. src/app/api/support/orders/[id]/route.ts: GET full detail (any order);
   PATCH requireSupport LIMITED actions { action }:
     add_note { note } → append SupportNote
     cancel { reason } → only pending/confirmed/processing (NOT shipped/delivered),
       set cancelled, if paid flag refund-needed, restock via inventory.adjustStock type "return"
     resend_confirmation → re-trigger email (stub/log)
   Support CANNOT set arbitrary statuses or edit prices. logAudit every action.
3. Add SupportNote model:
   model SupportNote { id String @id @default(cuid()) orderId String userId String
     note String @db.Text createdAt DateTime @default(now())
     order Order @relation(fields:[orderId],references:[id],onDelete:Cascade)
     author User @relation(fields:[userId],references:[id],onDelete:Cascade)
     @@index([orderId]) @@map("support_notes") }
   Relations: Order → supportNotes SupportNote[]; User → supportNotes SupportNote[]. db push + generate.
4. src/app/(support)/dashboard/orders/page.tsx ("use client"): DashboardShell "Order Lookup",
   search + DataTable, row → detail
5. src/app/(support)/dashboard/orders/[id]/page.tsx — server: order detail (reuse OrderStatusTimeline),
   customer block, items, address, internal notes thread (SupportNote) + Add note,
   action buttons (SupportOrderActions): Add Note, Cancel (confirm+reason if allowed), Resend Confirmation
6. src/components/support/SupportOrderActions.tsx ("use client"): the buttons + dialogs;
   each → PATCH /api/support/orders/[id] → notifySuccess → refresh

Show me all files with full implementation including the SupportNote schema change.
```

### Step SP.4 — Support tests + verify loop

```
Test the support role and run the verify loop.

1. src/tests/unit/support-orders.test.ts (mock @/server/db): cancel allowed
   pending/confirmed/processing; BLOCKED shipped/delivered (throws); paid cancel flags refund + restocks;
   add_note creates SupportNote linked to order + author
2. src/tests/e2e/support.spec.ts: login support@shop.com, /support/dashboard stat cards,
   Order Lookup search → detail → add note appears, Customer Lookup test@shop.com read-only (no edit),
   customer visiting /support → /403, support visiting /admin → /403
3. LOOP: npx prisma validate (SupportNote) → npm run build → npm test → npm run test:e2e → npm run lint
4. Checklist: SupportNote created; support sidebar lookup-only; customer lookup read-only;
   order assistance note+cancel(limited)+resend; cancel blocked shipped/delivered;
   support redirected from /admin and /shop-manager; build/tests clean.
```

---

## Phase 10 — Testing, SEO & Deployment

> The final phase: harden, optimize, and ship. Covers coverage gates, SEO/perf polish, env hardening, Docker, CI/CD, and production deploy with a pre-launch checklist.

### Step 10.1 — Full test coverage + coverage gate

```
Raise test coverage across the app and add a coverage gate.

1. Update vitest.config.ts coverage: thresholds lines 70, functions 70, branches 60, statements 70;
   include src/server/services, src/lib, src/components; exclude tests, .next, node_modules, types, *.d.ts
2. Fill gaps — tests for every untested service (category, address, review, search, admin stats,
   manager stats, support orders, inventory): happy path + 1 edge (not found/unauthorized/validation)
3. Integration tests (src/tests/integration/) hitting route handlers with mocked prisma:
   products GET shape; cart add → get reflects; order create → stock decrements via ledger;
   role guard non-admin gets 403 from /api/admin/*
4. e2e journey src/tests/e2e/full-journey.spec.ts: browse → cart → login → checkout(COD) → order → admin sees it
5. npm run test:coverage; if below thresholds add tests (do NOT lower thresholds). Show coverage table.
```

### Step 10.2 — SEO polish + performance audit

```
Finalize SEO and run a performance pass.

1. SEO: every page proper metadata (title, description, canonical); product+category dynamic OG images
   (opengraph-image.tsx or static fallback); validate JSON-LD Product/BreadcrumbList/Organization;
   sitemap includes all active products+categories; robots blocks /admin /shop-manager /support /api;
   add web manifest (src/app/manifest.ts) + theme color
2. Performance: all <img> → next/image with sizes; priority on hero, lazy elsewhere; dynamic imports
   for heavy client components (charts, RazorpayCheckout, gallery); revalidate / cache tags on
   product+category; npx next build, flag any First Load JS > 200kb and lazy-load it
3. A11y: alt text, aria-label on icon buttons, badge contrast AA, labels on forms
4. Lighthouse on /, /products, /products/[slug] in prod build (build && start);
   target Performance 85+, SEO 95+, A11y 90+; fix top 3 failing audits

Show me all changed/created files and the build route summary.
```

### Step 10.3 — Production env + config hardening

```
Harden configuration for production.

1. .env.example documenting EVERY var (keys + comments, no secrets): DATABASE_URL,
   BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
   NEXT_PUBLIC_RAZORPAY_KEY_ID, RAZORPAY_WEBHOOK_SECRET, NEXT_PUBLIC_SENTRY_DSN, NODE_ENV
2. src/lib/env.ts — zod runtime validation: schema for all required vars, parse process.env at startup,
   throw clear error if missing, export typed env, replace process.env.X with env.X,
   separate server-only from NEXT_PUBLIC_
3. next.config.ts prod: output "standalone", images.remotePatterns for CDN/placeholder host,
   poweredByHeader false, compress true, confirm security headers from Step D
4. .gitignore covers .env*, logs/, .next/, node_modules/, coverage/
5. prestart DB check script: verify DATABASE_URL connects before boot (fail fast, clear message)

Show me .env.example, src/lib/env.ts, and the updated next.config.ts.
```

### Step 10.4 — Docker + docker-compose (app + MySQL)

```
Containerize the app with MySQL 8.

1. Dockerfile (multi-stage, Next.js standalone): deps (npm ci) → builder (prisma generate, npm run build)
   → runner (node:20-alpine, copy .next/standalone + .next/static + public, non-root, EXPOSE 3000,
   CMD node server.js); run prisma migrate deploy on start via entrypoint
2. .dockerignore: node_modules, .next, .git, logs, .env*, coverage, tests
3. docker-compose.yml: db (mysql:8, env root password/database, data volume, healthcheck mysqladmin ping);
   app (build ., depends_on db healthy, env_file .env, ports 3000:3000, restart unless-stopped); named volume
4. docker-entrypoint.sh: wait for DB, npx prisma migrate deploy, optional seed if SEED=true, exec app
5. Switch from db push to migrations: npx prisma migrate dev --name init;
   dev = migrate dev, prod = migrate deploy
6. Test: docker compose up --build → :3000 reachable, tables created.
   Show Dockerfile, docker-compose.yml, entrypoint, run output.
```

### Step 10.5 — CI/CD pipeline (GitHub Actions)

```
Set up CI/CD with GitHub Actions.

1. .github/workflows/ci.yml (push + PR to main):
   job lint-test: checkout, node 20, npm ci, MySQL service container, prisma generate + db push (test DB),
     npm run lint, npm run test:coverage (must pass thresholds), cache node_modules + .next
   job e2e (needs lint-test): playwright install chromium, build + test:e2e, upload report on failure
   job build (needs lint-test): npm run build confirms prod build
2. .github/workflows/deploy.yml (push to main after CI):
   Option A Vercel (vercel deploy + secrets); Option B VPS/Docker (SSH, compose pull/up -d, migrate deploy);
   guard with environment protection + secrets
3. Required GitHub secrets: DATABASE_URL, BETTER_AUTH_SECRET, RAZORPAY_*, SENTRY_DSN,
   deploy creds (VERCEL_TOKEN or SSH key/host)
4. README status badges

Show me ci.yml, deploy.yml, and the secrets list.
```

### Step 10.6 — Deploy + pre-launch checklist

```
Deploy to production and run the final pre-launch checklist.

1. Deploy: Vercel (connect repo, set env, managed MySQL) OR VPS (docker compose up -d + nginx + certbot TLS)
2. Post-deploy: npx prisma migrate deploy on prod DB; prisma/seed-prod.ts creates ONE admin from env vars
   (NOT full faker seed); register Razorpay webhook (prod domain) + live keys; set Sentry DSN, confirm reports;
   DNS + HTTPS + www→apex redirect
3. Smoke test in prod: signup → verify email → login → browse → cart → checkout (Razorpay live test) → order;
   admin login → dashboard stats; /api/health ok; sitemap.xml + robots.txt resolve on live domain
4. PRE-LAUNCH CHECKLIST:
   ✓ All 4 roles tested in prod (customer, shop_manager, admin, support)
   ✓ Payments end to end + webhook updates status
   ✓ Emails send (verification, order confirmation)
   ✓ HTTPS + security headers live (securityheaders.com)
   ✓ Error logging + Sentry capturing
   ✓ Health endpoint monitored (uptime check)
   ✓ DB backups scheduled
   ✓ Rate limiting active on auth
   ✓ Sitemap submitted to Google Search Console
   ✓ Legal pages present (privacy, terms, returns)
   ✓ 404 + error pages styled
   ✓ Full faker seed NOT run on prod

Show me seed-prod.ts and the completed checklist.
```

---

## Phase 11 — Home page polish (premium storefront UI)

> Elevate the storefront to a modern, premium look: hero slider, announcement bar, trust signals, and reusable section scaffolding.

### Step 11.1 — Hero slider + announcement bar + trust strip

```
Build a stunning full-width hero slider plus the announcement bar and trust strip
for the home page. Modern, premium ecommerce look — generous spacing, smooth
motion, strong typography.

Install: npm install embla-carousel-react embla-carousel-autoplay framer-motion

1. src/components/home/AnnouncementBar.tsx ("use client"):
   - Thin top strip above the header, brand-accent background
   - Rotating messages (fade): "Free shipping over ₹999", "Extra 10% off first
     order", "24/7 support"; auto-rotate 4s; subtle framer-motion fade
   - Dismissible (X) — hidden for the session via in-memory state (NOT localStorage)

2. src/components/home/HeroSlider.tsx ("use client"):
   - FULL-WIDTH (edge to edge, breaks out of container) embla + autoplay carousel
   - 3–4 slides; each: large bg image (https://picsum.photos/1600/700?random=N),
     dark gradient overlay left→right, eyebrow, big headline (clamp 2rem→4rem),
     subtext, two CTAs ("Shop Now" primary, "Explore" ghost); framer-motion text
     slides up + fades in on slide change
   - Autoplay 5s, pause on hover; custom dots + prev/next arrows (hidden on mobile)
   - Height 70vh desktop / 50vh tablet / 60vh mobile; full bleed
   - Accessible: aria-labels on arrows, alt on images

3. src/components/home/TrustStrip.tsx:
   - 4 columns: Free Shipping, Secure Payment, Easy Returns, 24/7 Support
   - Each: lucide icon in a soft circle, title, one-line subtext
   - Responsive 4 → 2x2 mobile; subtle border band

4. src/components/home/SectionHeading.tsx:
   - Reusable: props { eyebrow?, title, subtitle?, action? (label+href) }
   - Centered or left variants; "View all →" link on the right; used by all sections

Design rules: existing Tailwind theme + shadcn colors, transition-all duration-300,
hover lift, soft elevation only (no harsh shadows), mobile-first.
```

### Step 11.2 — ProductCard visual variants

```
Upgrade ProductCard to support 4 distinct visual variants via a `variant` prop.
Keep the existing add-to-cart + wishlist logic from Phase 6, just expand the
presentation.

Update src/components/shared/ProductCard.tsx ("use client"). Props { product,
variant = "default" }

VARIANT "default" (vertical workhorse): square image (hover: zoom + quick add-to-cart
  bar slides up), Sale/New badge top-left, wishlist heart top-right, category eyebrow,
  name (2-line clamp), star rating, price (compare struck + savings)
VARIANT "compact" (dense grids / best sellers): smaller, tighter, image + name + price
  only, optional rank number badge (pass `rank` prop), no add button, whole card clickable
VARIANT "horizontal" (lists / recently viewed / cart): image left (96px), info right,
  name + price + meta + inline add button
VARIANT "featured" (hero highlights): large, image fills card with dark gradient overlay,
  text overlaid bottom (name, price, CTA), "Featured" ribbon, taller aspect, hover scale

Shared: Next/Image with sizes + lazy (priority only if prop set); Sale badge if
comparePrice>price, "New" if created < 14 days; out-of-stock = greyscale + "Sold out"
overlay + disabled actions; consistent rounded corners + soft shadow + smooth hover;
same add-to-cart handler (POST /api/cart/items, notify + open CartDrawer, redirect to
login if unauthed).

Also update ProductCardSkeleton to accept the same `variant` prop and match each shape.
```

### Step 11.3 — CategoryCard + BannerCard + CategoryGrid

```
Create CategoryCard (4 styles) and BannerCard (3 styles) — building blocks for the
category section and promo banners.

1. src/components/home/CategoryCard.tsx ("use client"). Props { category, variant = "overlay" }
   "overlay": image fills, dark gradient bottom, name + count overlaid, hover zoom + name slides up
   "circle": circular image + name below + count (classic pill, good for horizontal scroll)
   "gradient": no image — gradient bg (rotate palette by index), big lucide icon, name, count
   "minimal": clean white card, small image, name, count, thin border, arrow on hover
   All link to /products?categoryId=[id]; images https://picsum.photos/400/400?random=N

2. src/components/home/BannerCard.tsx ("use client").
   Props { title, subtitle, image, href, cta, variant = "split" }
   "split": text one side, image other (alternating via `reverse` prop)
   "overlay": full image bg, text overlaid, gradient scrim
   "minimal": solid/gradient bg color, large text, small CTA, no image
   Rounded-2xl, generous padding, hover scale on CTA, responsive stacking

3. src/components/home/CategoryGrid.tsx:
   - Responsive grid of CategoryCards, `variant` prop switches style for whole grid
   - Horizontal scroll-snap row option for "circle" variant on mobile

Design: cohesive with ProductCard, soft shadows, rounded-xl/2xl, smooth hover, responsive,
dark-mode friendly.
```

### Step 11.4 — Data-driven home sections + best-sellers endpoint

```
Build the data-driven home page sections. Add a best-sellers endpoint (doesn't
exist yet), then build each section.

1. src/app/api/products/best-sellers/route.ts:
   - GET public: top products by total quantity sold (group OrderItem by productId,
     sum quantity, join product, only active), limit param (default 10)
   - Returns products with a soldCount field

2. src/components/home/FeaturedSection.tsx — server component:
   - Fetch /api/products/featured; SectionHeading "Featured Products" + View all
   - Mix layout: 1 large variant="featured" + grid of variant="default"

3. src/components/home/NewArrivalsSection.tsx — "use client":
   - Fetch /api/products?sortBy=createdAt&sortOrder=desc&limit=10
   - SectionHeading "New Arrivals"; embla horizontal carousel of default cards, arrows + drag + snap

4. src/components/home/BestSellersSection.tsx — server component:
   - Fetch /api/products/best-sellers; SectionHeading "Best Sellers"
   - Grid of variant="compact" WITH rank numbers (1,2,3…) and soldCount

5. src/components/home/TopCategoriesSection.tsx — server component:
   - Categories with product counts; SectionHeading "Shop by Category"
   - CategoryGrid variant="overlay" desktop, "circle" scroll row mobile

6. src/components/home/DealOfTheDaySection.tsx — "use client":
   - One featured discounted product; BannerCard-style block with live countdown
     (resets daily at midnight), big image, price + savings, "Grab the deal" CTA

Each section: lazy below the fold, Suspense + skeleton fallback, py-12 md:py-16,
max-width container except full-bleed banners.
```

### Step 11.5 — Remaining sections + assemble home page

```
Build the remaining sections and assemble the complete home page.

1. src/components/home/PromoBanners.tsx — 2-up split BannerCards (one reverse), stacks on mobile
2. src/components/home/BrandMarquee.tsx ("use client") — infinite CSS marquee logo strip, pause on hover, 6-8 picsum grayscale logos
3. src/components/home/TestimonialsSection.tsx ("use client") — embla carousel of testimonial cards (avatar, name, stars, quote), 4-6 sample
4. src/components/home/NewsletterSection.tsx ("use client") — full-width gradient band, email input + Subscribe → notifySuccess stub (TODO backend), privacy note
5. Assemble src/app/(store)/page.tsx (server):
   AnnouncementBar (in layout above header) → HeroSlider → TrustStrip → TopCategoriesSection
   → FeaturedSection → PromoBanners → NewArrivalsSection → BestSellersSection
   → DealOfTheDaySection → BrandMarquee → TestimonialsSection → NewsletterSection
   - Suspense + skeleton per section; generateMetadata; keep OrganizationJsonLd
   - Mount AnnouncementBar in the (store) layout above the header

6. Verify: npm run build; hero autoplay/arrows, card variants, mobile carousel drag,
   countdown ticks, marquee scrolls, newsletter toast; LCP hero image priority, no CLS;
   responsive 375/768/1280 no overflow.
```

---

## Build Complete

All 10 phases plus the Support role are covered. Run order: Phase 1 → 2 → 3 → supplementary libraries → error logging → Phase 4 → 5 → 6 → 7 → seeder → Phase 8 → 9 → Support role → Phase 10. Verify after each phase before moving on.

Four roles, fully built: `customer` (storefront + checkout), `shop_manager` (inventory + fulfillment), `admin` (full management), `support` (lookup + assistance). Auth via better-auth, data in MySQL 8 via Prisma, payments via Razorpay, tested with Vitest + Playwright, shipped with Docker + GitHub Actions.

*Generated as a build reference. Each prompt is self-contained — run in order, verify after each phase before proceeding.*