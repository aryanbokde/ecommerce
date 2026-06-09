import "server-only";

import crypto from "crypto";
import Razorpay from "razorpay";
import { AppError, ErrorCode } from "@/lib/api-error";
import { env } from "@/lib/env";

// Server-side Razorpay client + signature verification. Keys come from the
// environment (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) and must never reach the
// client bundle — this module is `server-only`.
//
// ── TEST MODE ────────────────────────────────────────────────────────────────
// .env.local must use TEST keys (the key id is prefixed `rzp_test_`). In test
// mode no real money moves and you can complete payments with:
//   • Card:  4111 1111 1111 1111 · any future expiry · any CVV · any name
//   • UPI:   success@razorpay  (use failure@razorpay to simulate a failure)
//   • Netbanking: pick any bank, then "Success" on the simulator screen
// Get test keys + the webhook secret from the Razorpay Dashboard in Test mode.

const keyId = env.RAZORPAY_KEY_ID;
const keySecret = env.RAZORPAY_KEY_SECRET;

// Instantiated lazily so importing this module never throws at build/startup
// when keys aren't configured — only an actual payment call surfaces the error.
let instance: Razorpay | null = null;
function client(): Razorpay {
  if (!keyId || !keySecret) {
    throw new AppError(
      "Razorpay is not configured (missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)",
      ErrorCode.SERVER_ERROR,
      500
    );
  }
  return (instance ??= new Razorpay({ key_id: keyId, key_secret: keySecret }));
}

/** Create a Razorpay order. `amount` is in RUPEES; Razorpay wants paise. */
export async function createRazorpayOrder(amount: number, receipt: string) {
  const order = await client().orders.create({
    amount: Math.round(amount * 100), // rupees → paise
    currency: "INR",
    receipt,
  });
  return {
    orderId: order.id,
    amount: Number(order.amount), // paise
    currency: order.currency,
  };
}

/**
 * Verify a Razorpay payment signature: HMAC-SHA256 of `${orderId}|${paymentId}`
 * keyed with the secret, compared constant-time against the returned signature.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!keySecret) {
    throw new AppError(
      "Razorpay is not configured (missing RAZORPAY_KEY_SECRET)",
      ErrorCode.SERVER_ERROR,
      500
    );
  }
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature ?? "", "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Verify a Razorpay *webhook* signature: HMAC-SHA256 of the RAW request body
 * keyed with RAZORPAY_WEBHOOK_SECRET, compared constant-time against the
 * `X-Razorpay-Signature` header. Must be passed the raw (unparsed) body.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new AppError(
      "Razorpay webhook secret not configured (missing RAZORPAY_WEBHOOK_SECRET)",
      ErrorCode.SERVER_ERROR,
      500
    );
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature ?? "", "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
