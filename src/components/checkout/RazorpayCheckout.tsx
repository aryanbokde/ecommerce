"use client";

import { useEffect } from "react";
import { loadScript } from "@/lib/load-script";

const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const BRAND_COLOR = "#4f46e5";

/**
 * Mount once (e.g. in the review step) to preload the Razorpay Checkout script
 * so it's ready by the time the user hits "Place Order". Renders nothing.
 */
export function RazorpayCheckout() {
  useEffect(() => {
    void loadScript(RAZORPAY_SRC);
  }, []);
  return null;
}

export interface OpenRazorpayParams {
  keyId: string;
  amount: number; // paise (from the create-order response)
  razorpayOrderId: string;
  /** Needed by the verify-payment route to persist the paid order. */
  addressId: string;
  notes?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  onSuccess: (order: { orderId: string; orderNumber: string }) => void;
  onError: (reason: string) => void;
}

/**
 * Open the Razorpay Checkout modal. On a successful payment the handler verifies
 * the signature server-side (POST /api/checkout/verify-payment) — which is what
 * actually creates the paid order — then calls onSuccess. A dismissed modal
 * calls onError("cancelled").
 */
export async function openRazorpay({
  keyId,
  amount,
  razorpayOrderId,
  addressId,
  notes,
  prefill,
  onSuccess,
  onError,
}: OpenRazorpayParams) {
  const loaded = await loadScript(RAZORPAY_SRC);
  if (!loaded || typeof window.Razorpay !== "function") {
    onError("Could not load Razorpay. Check your connection and try again.");
    return;
  }

  const rzp = new window.Razorpay({
    key: keyId,
    amount,
    currency: "INR",
    order_id: razorpayOrderId,
    name: "MyShop",
    description: "Order payment",
    prefill,
    theme: { color: BRAND_COLOR },
    handler: async (response) => {
      try {
        const res = await fetch("/api/checkout/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            addressId,
            notes,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          onError(json?.error ?? "Payment verification failed");
          return;
        }
        onSuccess({
          orderId: json.data.orderId,
          orderNumber: json.data.orderNumber,
        });
      } catch {
        onError("Payment verification failed");
      }
    },
    modal: {
      ondismiss: () => onError("cancelled"),
    },
  });

  rzp.open();
}
