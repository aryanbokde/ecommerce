"use client";

import { ArrowLeft, ArrowRight, CreditCard, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCheckout, type PaymentMethod } from "@/hooks/useCheckout";
import { cn } from "@/lib/utils";

const PAYMENT_OPTIONS: {
  value: PaymentMethod;
  title: string;
  description: string;
  icon: typeof CreditCard;
}[] = [
  {
    value: "razorpay",
    title: "Pay online (Razorpay)",
    description: "Cards, UPI, net banking & wallets",
    icon: CreditCard,
  },
  {
    value: "cod",
    title: "Cash on Delivery",
    description: "Pay in cash when your order arrives",
    icon: Truck,
  },
];

export function PaymentStep() {
  const paymentMethod = useCheckout((s) => s.paymentMethod);
  const setPaymentMethod = useCheckout((s) => s.setPaymentMethod);
  const notes = useCheckout((s) => s.notes);
  const setNotes = useCheckout((s) => s.setNotes);
  const setStep = useCheckout((s) => s.setStep);

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Payment method
      </h2>

      <RadioGroup
        value={paymentMethod}
        onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
        className="gap-3"
      >
        {PAYMENT_OPTIONS.map((opt) => {
          const selected = opt.value === paymentMethod;
          const Icon = opt.icon;
          return (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
                selected
                  ? "border-primary ring-1 ring-primary"
                  : "border-border hover:border-foreground/30"
              )}
            >
              <RadioGroupItem value={opt.value} />
              <Icon className="size-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{opt.title}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </label>
          );
        })}
      </RadioGroup>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="order-notes"
          className="text-sm font-medium text-foreground"
        >
          Order notes (optional)
        </label>
        <textarea
          id="order-notes"
          rows={3}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Delivery instructions, landmark, etc."
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="flex justify-between border-t border-border pt-5">
        <Button variant="ghost" onClick={() => setStep("address")}>
          <ArrowLeft />
          Back
        </Button>
        <Button size="lg" onClick={() => setStep("review")}>
          Continue to Review
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
