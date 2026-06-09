/**
 * Seeds default store settings + the 10 email-template rows so the DB matches
 * the hardcoded defaults in src/lib/email.ts and src/lib/seo.ts.
 *
 * All writes are upserts → safe to re-run. Content fields are re-synced to the
 * code defaults on every run; a template's `enabled` flag is only set on first
 * create, so an admin's enable/disable choice survives a reseed.
 *
 * Run standalone:  npx tsx prisma/seed-settings.ts
 * Or via the main seeder (which calls seedSettings()):  npx prisma db seed
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { PrismaClient } from "../src/generated/prisma";

// ── Store settings ────────────────────────────────────────────────────────────
// Grouped key/value rows. `getStoreConfig()` reads these by key regardless of
// group; the group is just for organising the admin settings UI.
interface SettingSeed {
  key: string;
  value: string;
  group: string;
}

export const STORE_SETTINGS: SettingSeed[] = [
  // general
  { group: "general", key: "storeName", value: "MyShop" },
  { group: "general", key: "storeLogo", value: "" },
  { group: "general", key: "storeAddress", value: "Bengaluru, Karnataka, India" },
  { group: "general", key: "storePhone", value: "" },
  { group: "general", key: "supportEmail", value: "support@myshop.local" },
  // commerce — mirrors the constants in order.service.ts (18% tax, ₹99 fee, free over ₹999)
  { group: "commerce", key: "currency", value: "INR" },
  { group: "commerce", key: "taxPercent", value: "18" },
  { group: "commerce", key: "freeShippingThreshold", value: "999" },
  { group: "commerce", key: "shippingFee", value: "99" },
  { group: "commerce", key: "cancellationsEnabled", value: "true" },
  { group: "commerce", key: "returnsEnabled", value: "true" },
  { group: "commerce", key: "returnWindowDays", value: "7" },
  // social
  { group: "social", key: "socialFacebook", value: "" },
  { group: "social", key: "socialInstagram", value: "" },
  { group: "social", key: "socialTwitter", value: "" },
  // seo — mirrors src/lib/seo.ts defaults
  { group: "seo", key: "metaTitle", value: "MyShop" },
  { group: "seo", key: "metaDescription", value: "Your one-stop ecommerce store" },
];

// ── Email templates ───────────────────────────────────────────────────────────
// One row per email in src/lib/email.ts. {name} and {orderNumber} are dynamic
// placeholder tokens substituted at send time.
interface TemplateSeed {
  key: string;
  category: "auth" | "order" | "admin";
  name: string;
  subject: string;
  heading: string;
  introText: string;
  ctaLabel: string;
  footerNote: string;
}

export const EMAIL_TEMPLATES: TemplateSeed[] = [
  // ── AUTH ──
  {
    key: "verify_email",
    category: "auth",
    name: "Verify Email",
    subject: "Confirm your email",
    heading: "Confirm your email address",
    introText:
      "Hi {name}, welcome to MyShop! Tap the button below to verify your email and activate your account.",
    ctaLabel: "Verify my email",
    footerNote:
      "Didn't sign up? You can safely ignore this email — no account will be created.",
  },
  {
    key: "welcome",
    category: "auth",
    name: "Welcome",
    subject: "Welcome to MyShop 🎉",
    heading: "Welcome to MyShop, {name}! 🎉",
    introText:
      "Your email is verified and your account is ready. Discover the latest arrivals, save your favourites, and enjoy a fast, secure checkout.",
    ctaLabel: "Start shopping",
    footerNote: "Need help getting started? Just reply to this email.",
  },
  {
    key: "reset_password",
    category: "auth",
    name: "Reset Password",
    subject: "Reset your password",
    heading: "Reset your password",
    introText:
      "Hi {name}, we received a request to reset your password. Click below to choose a new one. This link expires in 1 hour.",
    ctaLabel: "Reset my password",
    footerNote:
      "If you didn't request this, you can ignore this email — your password won't change.",
  },
  {
    key: "password_changed",
    category: "auth",
    name: "Password Changed",
    subject: "Your password was changed",
    heading: "Your password was changed",
    introText:
      "Hi {name}, this is a confirmation that your MyShop account password was just changed.",
    ctaLabel: "Contact support",
    footerNote:
      "If you didn't make this change, contact support immediately — your account may be at risk.",
  },

  // ── ORDER ──
  {
    key: "order_confirmed",
    category: "order",
    name: "Order Confirmed",
    subject: "Order {orderNumber} confirmed",
    heading: "Thanks for your order!",
    introText:
      "We've received your order and we're getting it ready. Here's your summary:",
    ctaLabel: "View your order",
    footerNote: "We'll send another email as soon as your order ships.",
  },
  {
    key: "order_shipped",
    category: "order",
    name: "Order Shipped",
    subject: "Your order is on the way 📦",
    heading: "Your order has shipped 📦",
    introText: "Good news — your order {orderNumber} is on its way!",
    ctaLabel: "Track your order",
    footerNote: "Delivery usually takes 3–5 business days.",
  },
  {
    key: "order_delivered",
    category: "order",
    name: "Order Delivered",
    subject: "Delivered ✅ — rate your purchase",
    heading: "Your order has been delivered ✅",
    introText:
      "Your order {orderNumber} has been delivered. We hope you love it!",
    ctaLabel: "Rate your purchase",
    footerNote: "Something not right? Reach out and we'll make it good.",
  },
  {
    key: "order_cancelled",
    category: "order",
    name: "Order Cancelled",
    subject: "Your order was cancelled",
    heading: "Your order was cancelled",
    introText: "Your order {orderNumber} has been cancelled.",
    ctaLabel: "Continue shopping",
    footerNote: "Questions about this cancellation? We're happy to help.",
  },

  // ── ADMIN ──
  {
    key: "role_changed",
    category: "admin",
    name: "Role Changed",
    subject: "Your account role changed",
    heading: "Your account role was updated",
    introText:
      "Hi {name}, an administrator has updated your access level on MyShop.",
    ctaLabel: "Go to your account",
    footerNote: "If you weren't expecting this change, please contact support.",
  },
  {
    key: "account_suspended",
    category: "admin",
    name: "Account Suspended",
    subject: "Your account is suspended",
    heading: "Your account has been suspended",
    introText:
      "Hi {name}, your MyShop account has been suspended and you won't be able to sign in.",
    ctaLabel: "Contact support",
    footerNote:
      "If you believe this is a mistake, contact support and we'll review your account.",
  },
];

/**
 * Upsert all default settings + templates. Accepts a PrismaClient so the main
 * seeder can reuse its connection. Returns the counts written.
 */
export async function seedSettings(
  prisma: PrismaClient
): Promise<{ settings: number; templates: number }> {
  for (const s of STORE_SETTINGS) {
    await prisma.storeSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, group: s.group },
      create: s,
    });
  }

  for (const t of EMAIL_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { key: t.key },
      // `enabled` intentionally omitted from update → preserves an admin's
      // enable/disable choice across reseeds (only set to true on first create).
      update: {
        category: t.category,
        name: t.name,
        subject: t.subject,
        heading: t.heading,
        introText: t.introText,
        ctaLabel: t.ctaLabel,
        footerNote: t.footerNote,
      },
      create: { ...t, enabled: true },
    });
  }

  console.log(
    `✓ Seeded settings (${STORE_SETTINGS.length}) + email templates (${EMAIL_TEMPLATES.length})`
  );
  return { settings: STORE_SETTINGS.length, templates: EMAIL_TEMPLATES.length };
}

// ── Standalone runner ─────────────────────────────────────────────────────────
// Only runs when this file is executed directly (not when imported by seed.ts).
const invokedDirectly =
  !!process.argv[1] && /seed-settings\.[tj]s$/.test(process.argv[1].replace(/\\/g, "/"));

if (invokedDirectly) {
  const prisma = new PrismaClient();
  seedSettings(prisma)
    .then((r) =>
      console.log(
        `\n✅ Done — ${r.settings} settings, ${r.templates} email templates.`
      )
    )
    .catch((e) => {
      console.error("❌ seed-settings failed:", e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
