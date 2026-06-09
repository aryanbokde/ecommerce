import { type NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import {
  setOrderPaymentStatusByPaymentId,
  confirmPaidOrderByPaymentId,
} from "@/server/services/order.service";
import logger from "@/lib/logger";

// Razorpay webhook — invoked server-to-server by Razorpay (NO user session).
// Authenticity is enforced via the X-Razorpay-Signature HMAC, not auth.
// This is a RELIABILITY BACKSTOP: verify-payment is the primary path that
// persists a paid order; the webhook reconciles status if that ever fails.
export async function POST(req: NextRequest) {
  // Signature must be computed over the RAW body, so read text (not json).
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  // 1. Authenticity.
  let valid = false;
  try {
    valid = verifyWebhookSignature(rawBody, signature);
  } catch (error) {
    logger.error("Razorpay webhook: cannot verify (secret missing?)", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ received: false }, { status: 500 });
  }
  if (!valid) {
    logger.warn("Razorpay webhook: invalid signature — rejected");
    return NextResponse.json({ received: false }, { status: 400 });
  }

  // 2. Dispatch. Past this point ALWAYS return 200 so Razorpay stops retrying
  //    events we've accepted (a transient DB error is logged but not retried —
  //    verify-payment already owns the paid state).
  let event: string | undefined;
  let paymentId: string | undefined;
  try {
    const body = JSON.parse(rawBody);
    event = body?.event;
    // order.paid, payment.captured and payment.failed all carry the payment
    // entity, so we can always match our order by its stored paymentId.
    paymentId = body?.payload?.payment?.entity?.id;
    logger.info("Razorpay webhook received", { event, paymentId });

    if (!paymentId) {
      logger.info("Razorpay webhook: no payment id in payload — ignoring", {
        event,
      });
      return NextResponse.json({ received: true });
    }

    switch (event) {
      case "payment.captured": {
        const result = await setOrderPaymentStatusByPaymentId(paymentId, "paid");
        logger.info("Razorpay webhook: payment.captured", { paymentId, result });
        break;
      }
      case "payment.failed": {
        const result = await setOrderPaymentStatusByPaymentId(
          paymentId,
          "failed"
        );
        logger.info("Razorpay webhook: payment.failed", { paymentId, result });
        break;
      }
      case "order.paid": {
        const result = await confirmPaidOrderByPaymentId(paymentId);
        logger.info("Razorpay webhook: order.paid", { paymentId, result });
        break;
      }
      default:
        logger.info("Razorpay webhook: unhandled event ignored", { event });
    }
  } catch (error) {
    logger.error("Razorpay webhook: handler error", {
      event,
      paymentId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json({ received: true });
}
