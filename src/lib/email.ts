import "server-only";

import logger from "@/lib/logger";
import { AppError, ErrorCode } from "@/lib/api-error";
import { isTemplateEnabled, getTemplate } from "@/server/services/email-template.service";
import { getStoreConfig, type StoreConfig } from "@/server/services/settings.service";
import { logEmail, type EmailStatus } from "@/server/services/email-log.service";

// ── Email ─────────────────────────────────────────────────────────────────────
// Every send is keyed to an EmailTemplate row (templateKey). At send time:
//   1. isTemplateEnabled(key) — if disabled, the email is skipped (logged) and
//      NOT delivered, so an admin toggling a template off stops it everywhere.
//   2. The row supplies subject / heading / introText / ctaLabel / footerNote
//      (tokens like {name}, {orderNumber} replaced with real values). Missing
//      row → the hardcoded `fallback` copy on the request is used.
//   3. getStoreConfig() supplies branding (name/logo in the header; address,
//      support email and socials in the footer).
// The visual layout (renderEmail) is unchanged — only TEXT + branding are DB-driven.
//
// Transport is selected by EMAIL_PROVIDER: "log" (default — writes to the logger)
// or "smtp" (nodemailer; on localhost pointed at Mailtrap's capture sandbox).

const PROVIDER = process.env.EMAIL_PROVIDER ?? "log";
const FROM = process.env.EMAIL_FROM ?? "MyShop <no-reply@myshop.local>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const SUPPORT_EMAIL = process.env.EMAIL_SUPPORT ?? "support@myshop.local";
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// ── Transport ──────────────────────────────────────────────────────────────────

interface RenderedMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let transporterPromise: Promise<import("nodemailer").Transporter> | null = null;

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = import("nodemailer").then((nodemailer) =>
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        // Mailtrap sandbox uses STARTTLS on 587/2525 (secure=false); 465 is TLS.
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    );
  }
  return transporterPromise;
}

async function deliver(msg: RenderedMessage): Promise<void> {
  if (PROVIDER === "smtp") {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: FROM,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
    logger.info(`📧 [email:smtp] sent "${msg.subject}" → ${msg.to}`, {
      messageId: info.messageId,
    });
    return;
  }

  // Default "log" transport: print the email (incl. any links) to the logger.
  logger.info(`📧 [email] ${msg.subject} → ${msg.to}`, {
    from: FROM,
    to: msg.to,
    subject: msg.subject,
    body: msg.text,
  });
}

// ── Shared HTML layout ──────────────────────────────────────────────────────
// Renders a responsive, email-client-safe (table-based, inline-styled) document
// with a branded header, an accent theme, a content card, an optional CTA button
// and detail panel, and a footer — branding pulled from StoreConfig.

const inr = (v: number | string) =>
  `₹${Number(v).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Replace {token} placeholders with provided values (unknown tokens kept as-is). */
function applyTokens(input: string, tokens: Record<string, string>): string {
  return input.replace(/\{(\w+)\}/g, (m, k) => (k in tokens ? tokens[k] : m));
}

interface CTA {
  label: string;
  url: string;
}

interface PanelRow {
  label: string;
  value: string;
}

interface RenderOpts {
  accent: string;
  eyebrow: string;
  heading: string;
  preheader: string;
  lead: string;
  panel?: PanelRow[];
  bodyHtml?: string;
  cta?: CTA;
  footnote?: string;
}

function button(label: string, url: string, accent: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;"><tr><td style="border-radius:8px;background:${accent};"><a href="${url}" style="display:inline-block;padding:13px 30px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(
    label
  )}</a></td></tr></table>`;
}

function panelHtml(rows: PanelRow[]): string {
  const body = rows
    .map(
      (r, i) =>
        `<tr><td style="padding:11px 16px;font-family:${FONT};font-size:13px;color:#6b7280;${
          i < rows.length - 1 ? "border-bottom:1px solid #eef0f3;" : ""
        }">${esc(r.label)}</td><td align="right" style="padding:11px 16px;font-family:${FONT};font-size:14px;font-weight:600;color:#111827;${
          i < rows.length - 1 ? "border-bottom:1px solid #eef0f3;" : ""
        }">${r.value}</td></tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;border-collapse:separate;overflow:hidden;margin:20px 0 4px;">${body}</table>`;
}

function brandHeader(config: StoreConfig | null): string {
  const name = config?.storeName || "MyShop";
  const logo = config?.storeLogo || "";
  const inner = logo
    ? `<img src="${logo}" alt="${esc(name)}" height="28" style="height:28px;display:block;border:0;">`
    : `<span style="font-family:${FONT};font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.02em;">🛍️ ${esc(
        name
      )}</span>`;
  return `<tr><td style="padding:4px 10px 18px;">${inner}</td></tr>`;
}

function brandFooter(config: StoreConfig | null): string {
  const name = config?.storeName || "MyShop";
  const address = config?.storeAddress || "Bengaluru, India";
  const support = config?.supportEmail || SUPPORT_EMAIL;
  const s = config?.socialLinks ?? {};
  const year = new Date().getFullYear();

  const socialParts = [
    s.facebook && `<a href="${s.facebook}" style="color:#6b7280;text-decoration:none;">Facebook</a>`,
    s.instagram && `<a href="${s.instagram}" style="color:#6b7280;text-decoration:none;">Instagram</a>`,
    s.twitter && `<a href="${s.twitter}" style="color:#6b7280;text-decoration:none;">Twitter</a>`,
  ].filter(Boolean);
  const socialHtml = socialParts.length
    ? `<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;color:#6b7280;">${socialParts.join(
        " &nbsp;·&nbsp; "
      )}</p>`
    : "";

  return `<tr><td style="padding:22px 10px;text-align:center;">
<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;color:#6b7280;"><a href="${APP_URL}/orders" style="color:#6b7280;text-decoration:none;">Your orders</a> &nbsp;·&nbsp; <a href="${APP_URL}/products" style="color:#6b7280;text-decoration:none;">Shop</a> &nbsp;·&nbsp; <a href="mailto:${support}" style="color:#6b7280;text-decoration:none;">Help</a></p>
${socialHtml}<p style="margin:0 0 4px;font-family:${FONT};font-size:12px;color:#9ca3af;">${esc(
    name
  )} · ${esc(address)}</p>
<p style="margin:0;font-family:${FONT};font-size:12px;color:#9ca3af;">© ${year} ${esc(
    name
  )}. All rights reserved.</p>
</td></tr>`;
}

function renderEmail(o: RenderOpts, config: StoreConfig | null): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${esc(
    o.heading
  )}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3f4f6;">${esc(
    o.preheader
  )}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
${brandHeader(config)}
<tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-top:4px solid ${
    o.accent
  };border-radius:14px;padding:36px 40px;">
<p style="margin:0 0 12px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${
    o.accent
  };">${esc(o.eyebrow)}</p>
<h1 style="margin:0 0 14px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:700;color:#111827;">${esc(
    o.heading
  )}</h1>
<p style="margin:0 0 4px;font-family:${FONT};font-size:15px;line-height:1.65;color:#4b5563;">${esc(
    o.lead
  )}</p>
${o.panel ? panelHtml(o.panel) : ""}
${o.bodyHtml ?? ""}
${o.cta ? button(o.cta.label, o.cta.url, o.accent) : ""}
${
  o.footnote
    ? `<p style="margin:20px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:#9ca3af;">${esc(
        o.footnote
      )}</p>`
    : ""
}
</td></tr>
${brandFooter(config)}
</table>
</td></tr>
</table>
</body></html>`;
}

// ── EmailRequest + sendEmail ────────────────────────────────────────────────
// A template function returns an EmailRequest: the structural/visual bits + the
// dynamic tokens + a hardcoded `fallback` copy. sendEmail merges in the DB row
// (or the fallback) and the store branding, then delivers + logs.

export interface EmailRequest {
  to: string;
  templateKey: string;
  tokens?: Record<string, string>;
  // Visual structure (never DB-driven).
  accent: string;
  eyebrow: string;
  preheader: string;
  ctaUrl?: string;
  panel?: PanelRow[];
  bodyHtml?: string;
  // Hardcoded copy used when no EmailTemplate row exists (graceful fallback).
  fallback: {
    subject: string;
    heading: string;
    introText: string;
    ctaLabel?: string;
    footerNote?: string;
  };
}

export interface SendResult {
  skipped: boolean;
  status: EmailStatus;
}

/**
 * Send a templated email. Never throws.
 * - Disabled template → not delivered; logged as "skipped"; returns { skipped: true }.
 * - Otherwise renders subject/copy from the DB row (or fallback) + branding, delivers,
 *   and logs "sent" / "failed".
 */
export async function sendEmail(
  req: EmailRequest,
  opts: { force?: boolean } = {}
): Promise<SendResult> {
  const tokens = req.tokens ?? {};

  // 1. Enabled gate (skipped for forced sends, e.g. admin "send test").
  let enabled = true;
  if (!opts.force) {
    try {
      enabled = await isTemplateEnabled(req.templateKey);
    } catch {
      enabled = true; // DB hiccup shouldn't silently drop mail
    }
  }

  // 2. Load the row (subject/copy overrides). Missing → null → use fallback.
  let row = null;
  try {
    row = await getTemplate(req.templateKey);
  } catch {
    row = null;
  }

  const subject = applyTokens(row?.subject ?? req.fallback.subject, tokens);

  if (!enabled) {
    await logEmail({
      templateKey: req.templateKey,
      recipient: req.to,
      subject,
      status: "skipped",
    });
    logger.info(`📭 [email] skipped (disabled): ${req.templateKey} → ${req.to}`);
    return { skipped: true, status: "skipped" };
  }

  const heading = applyTokens(row?.heading ?? req.fallback.heading, tokens);
  const introText = applyTokens(row?.introText ?? req.fallback.introText, tokens);
  const ctaLabel =
    applyTokens(row?.ctaLabel ?? req.fallback.ctaLabel ?? "", tokens) || undefined;
  const footerNote =
    applyTokens(row?.footerNote ?? req.fallback.footerNote ?? "", tokens) || undefined;

  // 3. Branding.
  let config: StoreConfig | null = null;
  try {
    config = await getStoreConfig();
  } catch {
    config = null;
  }

  const html = renderEmail(
    {
      accent: req.accent,
      eyebrow: req.eyebrow,
      heading,
      preheader: req.preheader,
      lead: introText,
      panel: req.panel,
      bodyHtml: req.bodyHtml,
      cta: ctaLabel && req.ctaUrl ? { label: ctaLabel, url: req.ctaUrl } : undefined,
      footnote: footerNote,
    },
    config
  );

  const text = `${introText}${
    ctaLabel && req.ctaUrl ? `\n\n${ctaLabel}: ${req.ctaUrl}` : ""
  }`;

  try {
    await deliver({ to: req.to, subject, html, text });
    await logEmail({
      templateKey: req.templateKey,
      recipient: req.to,
      subject,
      status: "sent",
    });
    return { skipped: false, status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Failed to send email", {
      to: req.to,
      subject,
      error: message,
    });
    await logEmail({
      templateKey: req.templateKey,
      recipient: req.to,
      subject,
      status: "failed",
      error: message,
    });
    return { skipped: false, status: "failed" };
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────
// Each returns an EmailRequest carrying its templateKey, visual structure,
// dynamic tokens, and the hardcoded fallback copy (mirrors the seeded rows).

const ROLE_LABEL: Record<string, string> = {
  customer: "Customer",
  shop_manager: "Shop Manager",
  support: "Support",
  admin: "Administrator",
};

export function verificationEmail(name: string, url: string): EmailRequest {
  return {
    to: "", // set by caller
    templateKey: "verify_email",
    tokens: { name },
    accent: "#4f46e5",
    eyebrow: "Verify your email",
    preheader: "One quick step to activate your MyShop account.",
    ctaUrl: url,
    fallback: {
      subject: "Verify your MyShop email",
      heading: "Confirm your email address",
      introText:
        "Hi {name}, welcome to MyShop! Tap the button below to verify your email and activate your account.",
      ctaLabel: "Verify my email",
      footerNote:
        "Didn't sign up? You can safely ignore this email — no account will be created.",
    },
  };
}

export function resetPasswordEmail(name: string, url: string): EmailRequest {
  return {
    to: "",
    templateKey: "reset_password",
    tokens: { name },
    accent: "#d97706",
    eyebrow: "Password reset",
    preheader: "Choose a new password for your MyShop account.",
    ctaUrl: url,
    fallback: {
      subject: "Reset your MyShop password",
      heading: "Reset your password",
      introText:
        "Hi {name}, we received a request to reset your password. Click below to choose a new one. This link expires in 1 hour.",
      ctaLabel: "Reset my password",
      footerNote:
        "If you didn't request this, you can ignore this email — your password won't change.",
    },
  };
}

export function welcomeEmail(name: string): EmailRequest {
  return {
    to: "",
    templateKey: "welcome",
    tokens: { name },
    accent: "#059669",
    eyebrow: "Welcome",
    preheader: "Your account is verified and ready to go.",
    ctaUrl: `${APP_URL}/products`,
    fallback: {
      subject: "Welcome to MyShop 🎉",
      heading: "Welcome to MyShop, {name}! 🎉",
      introText:
        "Your email is verified and your account is ready. Discover the latest arrivals, save your favourites, and enjoy a fast, secure checkout.",
      ctaLabel: "Start shopping",
      footerNote: "Need help getting started? Just reply to this email.",
    },
  };
}

export function passwordChangedEmail(name: string): EmailRequest {
  const when = new Date().toLocaleString("en-IN");
  return {
    to: "",
    templateKey: "password_changed",
    tokens: { name, when },
    accent: "#dc2626",
    eyebrow: "Security alert",
    preheader: "Confirmation that your account password was updated.",
    ctaUrl: `mailto:${SUPPORT_EMAIL}`,
    panel: [{ label: "When", value: esc(when) }],
    fallback: {
      subject: "Your MyShop password was changed",
      heading: "Your password was changed",
      introText:
        "Hi {name}, this is a confirmation that your MyShop account password was just changed.",
      ctaLabel: "Contact support",
      footerNote:
        "If you didn't make this change, contact support immediately — your account may be at risk.",
    },
  };
}

export function orderConfirmationEmail(
  to: string,
  order: {
    orderNumber: string;
    total: number | string;
    items?: { name: string; quantity: number }[];
  }
): EmailRequest {
  const itemsHtml = order.items?.length
    ? `<p style="margin:18px 0 0;font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;">Items</p>` +
      panelHtml(
        order.items.map((i) => ({ label: i.name, value: `× ${i.quantity}` }))
      )
    : "";
  return {
    to,
    templateKey: "order_confirmed",
    tokens: { orderNumber: order.orderNumber },
    accent: "#059669",
    eyebrow: "Order confirmed",
    preheader: `Order ${order.orderNumber} received — total ${inr(order.total)}.`,
    ctaUrl: `${APP_URL}/orders`,
    panel: [
      { label: "Order number", value: esc(order.orderNumber) },
      { label: "Order total", value: inr(order.total) },
    ],
    bodyHtml: itemsHtml,
    fallback: {
      subject: "Order confirmed — {orderNumber}",
      heading: "Thanks for your order!",
      introText:
        "We've received your order and we're getting it ready. Here's your summary:",
      ctaLabel: "View your order",
      footerNote: "We'll send another email as soon as your order ships.",
    },
  };
}

export function orderShippedEmail(
  to: string,
  order: { orderNumber: string; trackingNumber?: string | null }
): EmailRequest {
  const panel: PanelRow[] = [
    { label: "Order number", value: esc(order.orderNumber) },
  ];
  if (order.trackingNumber)
    panel.push({ label: "Tracking number", value: esc(order.trackingNumber) });
  return {
    to,
    templateKey: "order_shipped",
    tokens: { orderNumber: order.orderNumber },
    accent: "#2563eb",
    eyebrow: "On its way",
    preheader: `Order ${order.orderNumber} is on its way.`,
    ctaUrl: `${APP_URL}/orders`,
    panel,
    fallback: {
      subject: "Your order has shipped — {orderNumber} 📦",
      heading: "Your order has shipped 📦",
      introText: "Good news — your order {orderNumber} is on its way!",
      ctaLabel: "Track your order",
      footerNote: "Delivery usually takes 3–5 business days.",
    },
  };
}

export function orderDeliveredEmail(
  to: string,
  order: { orderNumber: string }
): EmailRequest {
  return {
    to,
    templateKey: "order_delivered",
    tokens: { orderNumber: order.orderNumber },
    accent: "#059669",
    eyebrow: "Delivered",
    preheader: `Order ${order.orderNumber} has arrived.`,
    ctaUrl: `${APP_URL}/orders`,
    panel: [{ label: "Order number", value: esc(order.orderNumber) }],
    fallback: {
      subject: "Your order was delivered — {orderNumber} ✅",
      heading: "Your order has been delivered ✅",
      introText:
        "Your order {orderNumber} has been delivered. We hope you love it!",
      ctaLabel: "Rate your purchase",
      footerNote: "Something not right? Reach out and we'll make it good.",
    },
  };
}

export function orderCancelledEmail(
  to: string,
  order: { orderNumber: string; reason?: string; refundNeeded?: boolean }
): EmailRequest {
  const refundLine = order.refundNeeded
    ? `<p style="margin:16px 0 0;font-family:${FONT};font-size:15px;line-height:1.65;color:#4b5563;">A refund has been initiated and should reach your original payment method within <strong>5–7 business days</strong>.</p>`
    : "";
  const panel: PanelRow[] = [
    { label: "Order number", value: esc(order.orderNumber) },
  ];
  if (order.reason) panel.push({ label: "Reason", value: esc(order.reason) });
  return {
    to,
    templateKey: "order_cancelled",
    tokens: { orderNumber: order.orderNumber },
    accent: "#dc2626",
    eyebrow: "Order cancelled",
    preheader: `Order ${order.orderNumber} has been cancelled.`,
    ctaUrl: `${APP_URL}/products`,
    panel,
    bodyHtml: refundLine,
    fallback: {
      subject: "Your order was cancelled — {orderNumber}",
      heading: "Your order was cancelled",
      introText: "Your order {orderNumber} has been cancelled.",
      ctaLabel: "Continue shopping",
      footerNote: "Questions about this cancellation? We're happy to help.",
    },
  };
}

export function roleChangedEmail(
  name: string,
  data: { role: string }
): EmailRequest {
  const label = ROLE_LABEL[data.role] ?? data.role;
  return {
    to: "",
    templateKey: "role_changed",
    tokens: { name, role: label },
    accent: "#7c3aed",
    eyebrow: "Account update",
    preheader: `Your role is now ${label}.`,
    ctaUrl: `${APP_URL}/dashboard`,
    panel: [{ label: "New role", value: esc(label) }],
    fallback: {
      subject: "Your MyShop account role was updated",
      heading: "Your account role was updated",
      introText:
        "Hi {name}, an administrator has updated your access level on MyShop.",
      ctaLabel: "Go to your account",
      footerNote:
        "If you weren't expecting this change, please contact support.",
    },
  };
}

export function accountBannedEmail(
  name: string,
  data: { reason?: string } = {}
): EmailRequest {
  const panel: PanelRow[] = [];
  if (data.reason) panel.push({ label: "Reason", value: esc(data.reason) });
  return {
    to: "",
    templateKey: "account_suspended",
    tokens: { name },
    accent: "#dc2626",
    eyebrow: "Account suspended",
    preheader: "Important information about your MyShop account.",
    ctaUrl: `mailto:${SUPPORT_EMAIL}`,
    panel: panel.length ? panel : undefined,
    fallback: {
      subject: "Your MyShop account has been suspended",
      heading: "Your account has been suspended",
      introText:
        "Hi {name}, your MyShop account has been suspended and you won't be able to sign in.",
      ctaLabel: "Contact support",
      footerNote:
        "If you believe this is a mistake, contact support and we'll review your account.",
    },
  };
}

// ── Admin: preview + test ─────────────────────────────────────────────────────
// The admin Email-Templates page renders a live preview and sends test emails.
// Both reuse the real template builders with representative sample data so the
// output is identical to a production send.

const SAMPLE_NAME = "Aarav Sharma";
const SAMPLE_ORDER = "MS-20260605-1042";

function buildSampleRequest(key: string): EmailRequest | null {
  switch (key) {
    case "verify_email":
      return verificationEmail(SAMPLE_NAME, `${APP_URL}/verify-email?token=sample-token`);
    case "welcome":
      return welcomeEmail(SAMPLE_NAME);
    case "reset_password":
      return resetPasswordEmail(SAMPLE_NAME, `${APP_URL}/reset-password?token=sample-token`);
    case "password_changed":
      return passwordChangedEmail(SAMPLE_NAME);
    case "order_confirmed":
      return orderConfirmationEmail("", {
        orderNumber: SAMPLE_ORDER,
        total: 4798,
        items: [
          { name: "Classic Cotton T-Shirt", quantity: 2 },
          { name: "Canvas Sneakers", quantity: 1 },
        ],
      });
    case "order_shipped":
      return orderShippedEmail("", {
        orderNumber: SAMPLE_ORDER,
        trackingNumber: "BLUEDART-7711882200",
      });
    case "order_delivered":
      return orderDeliveredEmail("", { orderNumber: SAMPLE_ORDER });
    case "order_cancelled":
      return orderCancelledEmail("", {
        orderNumber: SAMPLE_ORDER,
        reason: "Item went out of stock",
        refundNeeded: true,
      });
    case "role_changed":
      return roleChangedEmail(SAMPLE_NAME, { role: "shop_manager" });
    case "account_suspended":
      return accountBannedEmail(SAMPLE_NAME, { reason: "Multiple policy violations" });
    default:
      return null;
  }
}

export interface TemplateCopyOverrides {
  subject?: string;
  heading?: string;
  introText?: string;
  ctaLabel?: string;
  footerNote?: string;
}

/**
 * Render a template to full HTML for the admin preview. `overrides` (the unsaved
 * editor values) win; otherwise the saved DB row; otherwise the hardcoded
 * fallback. Sample tokens + store branding are applied just like a real send.
 */
export async function renderTemplatePreview(
  key: string,
  overrides: TemplateCopyOverrides = {}
): Promise<string> {
  const req = buildSampleRequest(key);
  if (!req) {
    throw new AppError(`Unknown email template: ${key}`, ErrorCode.NOT_FOUND, 404);
  }

  const row = await getTemplate(key).catch(() => null);
  const tokens = req.tokens ?? {};

  const pick = (field: keyof TemplateCopyOverrides): string =>
    (overrides[field] ??
      (row?.[field] as string | null | undefined) ??
      req.fallback[field as keyof typeof req.fallback] ??
      "") as string;

  const heading = applyTokens(pick("heading"), tokens);
  const introText = applyTokens(pick("introText"), tokens);
  const ctaLabel = applyTokens(pick("ctaLabel"), tokens) || undefined;
  const footerNote = applyTokens(pick("footerNote"), tokens) || undefined;

  let config: StoreConfig | null = null;
  try {
    config = await getStoreConfig();
  } catch {
    config = null;
  }

  return renderEmail(
    {
      accent: req.accent,
      eyebrow: req.eyebrow,
      heading,
      preheader: req.preheader,
      lead: introText,
      panel: req.panel,
      bodyHtml: req.bodyHtml,
      cta: ctaLabel && req.ctaUrl ? { label: ctaLabel, url: req.ctaUrl } : undefined,
      footnote: footerNote,
    },
    config
  );
}

/** Send a real test email of `key` to `to`, bypassing the enabled gate. */
export async function sendTemplateTest(key: string, to: string): Promise<SendResult> {
  const req = buildSampleRequest(key);
  if (!req) {
    throw new AppError(`Unknown email template: ${key}`, ErrorCode.NOT_FOUND, 404);
  }
  return sendEmail({ ...req, to }, { force: true });
}
