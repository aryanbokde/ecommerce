import * as Sentry from "@sentry/nextjs";

// TODO: get DSN from https://sentry.io → Project → Settings → Client Keys
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
});
