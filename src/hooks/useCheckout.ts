"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem } from "@/hooks/useCart";

export type CheckoutStep = "address" | "payment" | "review";
export type PaymentMethod = "razorpay" | "cod";

export const STEP_ORDER: CheckoutStep[] = ["address", "payment", "review"];

interface CheckoutState {
  step: CheckoutStep;
  selectedAddressId: string | null;
  paymentMethod: PaymentMethod;
  notes: string;
  cart: CartItem[] | null;
  isProcessing: boolean;

  setStep: (step: CheckoutStep) => void;
  setAddress: (id: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setNotes: (notes: string) => void;
  setCart: (items: CartItem[] | null) => void;
  setProcessing: (value: boolean) => void;
  reset: () => void;
}

const initial = {
  step: "address" as CheckoutStep,
  selectedAddressId: null as string | null,
  paymentMethod: "razorpay" as PaymentMethod,
  notes: "",
  cart: null as CartItem[] | null,
  isProcessing: false,
};

/**
 * Wizard state for the checkout flow, shared across the page + step components.
 * Progress (step / address / payment / notes) is persisted to sessionStorage so
 * a refresh mid-checkout doesn't reset the wizard. The cart + isProcessing flag
 * are transient (re-fetched / re-derived) and deliberately NOT persisted.
 */
export const useCheckout = create<CheckoutState>()(
  persist(
    (set) => ({
      ...initial,
      setStep: (step) => set({ step }),
      setAddress: (selectedAddressId) => set({ selectedAddressId }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setNotes: (notes) => set({ notes }),
      setCart: (cart) => set({ cart }),
      setProcessing: (isProcessing) => set({ isProcessing }),
      reset: () => set({ ...initial }),
    }),
    {
      name: "checkout-wizard",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        step: s.step,
        selectedAddressId: s.selectedAddressId,
        paymentMethod: s.paymentMethod,
        notes: s.notes,
      }),
    }
  )
);
