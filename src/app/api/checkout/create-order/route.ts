import { type NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireUser, parseJsonBody } from "@/lib/api-auth";
import { AppError, ErrorCode } from "@/lib/api-error";
import prisma from "@/server/db";
import { quoteCheckout, createOrder } from "@/server/services/order.service";
import { createRazorpayOrder } from "@/lib/razorpay";
import { sendEmail, orderConfirmationEmail } from "@/lib/email";

const schema = z.object({
  addressId: z.string().trim().min(1, "addressId is required"),
  paymentMethod: z.enum(["razorpay", "cod"]),
  notes: z.string().max(2000).optional(),
});

// POST /api/checkout/create-order — start checkout.
//   razorpay → create a Razorpay order, return its id + amount + public key
//              (the DB order is created later, after payment verification).
//   cod      → create the DB order immediately (unpaid) and clear the cart.
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireUser();
  const userId = session.user.id;
  const { addressId, paymentMethod, notes } = await parseJsonBody(req, schema);

  // Address must belong to this user (createOrder re-checks, but fail early
  // before sending the customer off to pay).
  const address = await prisma.address.findUnique({
    where: { id: addressId },
    select: { userId: true },
  });
  if (!address || address.userId !== userId) {
    throw new AppError("Address not found", ErrorCode.NOT_FOUND, 404);
  }

  // Validate cart (non-empty, active, in stock) + compute authoritative totals.
  const quote = await quoteCheckout(userId);

  if (paymentMethod === "razorpay") {
    const rp = await createRazorpayOrder(
      Number(quote.total),
      `rcpt_${Date.now()}`
    );
    return NextResponse.json({
      success: true,
      message: "Razorpay order created",
      data: {
        paymentMethod: "razorpay",
        razorpayOrderId: rp.orderId,
        amount: rp.amount, // paise
        currency: rp.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        ...quote,
      },
    });
  }

  // COD — create the order now (unpaid) and empty the cart.
  const order = await createOrder(userId, {
    addressId,
    paymentMethod: "cod",
    notes,
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
      message: "Order placed",
      data: {
        paymentMethod: "cod",
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    },
    { status: 201 }
  );
});
