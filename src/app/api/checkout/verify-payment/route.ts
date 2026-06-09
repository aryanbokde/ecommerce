import { type NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireUser, parseJsonBody } from "@/lib/api-auth";
import { AppError, ErrorCode } from "@/lib/api-error";
import { createOrder } from "@/server/services/order.service";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { logAudit } from "@/server/services/audit-log.service";
import { sendEmail, orderConfirmationEmail } from "@/lib/email";

const schema = z.object({
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  signature: z.string().trim().min(1),
  addressId: z.string().trim().min(1),
  notes: z.string().max(2000).optional(),
});

// POST /api/checkout/verify-payment — verify a Razorpay payment, then persist
// the order as paid. The DB order is created ONLY after a valid signature, so an
// unpaid/forged payment never produces an order (and never decrements stock).
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireUser();
  const userId = session.user.id;
  const { razorpayOrderId, razorpayPaymentId, signature, addressId, notes } =
    await parseJsonBody(req, schema);

  const valid = verifyPaymentSignature(
    razorpayOrderId,
    razorpayPaymentId,
    signature
  );

  if (!valid) {
    await logAudit({
      userId,
      action: "payment_failed",
      status: "failed",
      metadata: { razorpayOrderId, razorpayPaymentId },
    });
    throw new AppError(
      "Payment verification failed",
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }

  const order = await createOrder(
    userId,
    { addressId, paymentMethod: "razorpay", notes },
    {
      paymentStatus: "paid",
      paymentId: razorpayPaymentId,
      razorpayOrderId,
      signature,
    }
  );

  await logAudit({
    userId,
    action: "payment_success",
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      razorpayOrderId,
      razorpayPaymentId,
    },
  });

  // Confirmation email — non-blocking, sent after the response.
  after(() =>
    sendEmail(
      orderConfirmationEmail(session.user.email, {
        orderNumber: order.orderNumber,
        total: Number(order.total),
      })
    )
  );

  return NextResponse.json(
    {
      success: true,
      message: "Payment verified, order placed",
      data: { orderId: order.id, orderNumber: order.orderNumber },
    },
    { status: 201 }
  );
});
