import { Truck, ShieldCheck, RotateCcw, Headset } from "lucide-react";

const ITEMS = [
  {
    Icon: Truck,
    title: "Free Shipping",
    text: "On all orders over ₹999",
  },
  {
    Icon: ShieldCheck,
    title: "Secure Payment",
    text: "100% protected checkout",
  },
  {
    Icon: RotateCcw,
    title: "Easy Returns",
    text: "7-day hassle-free returns",
  },
  {
    Icon: Headset,
    title: "24/7 Support",
    text: "We're here to help anytime",
  },
];

// Trust signals band — 4 across on desktop, 2×2 on mobile.
export function TrustStrip() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 lg:grid-cols-4">
          {ITEMS.map(({ Icon, title, text }) => (
            <div
              key={title}
              className="group flex items-center gap-3 transition-all duration-300 sm:gap-4"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-blue/12 text-brand-blue transition-transform duration-300 group-hover:-translate-y-0.5 sm:size-12">
                <Icon className="size-5 sm:size-6" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground sm:text-base">
                  {title}
                </p>
                <p className="truncate text-xs text-muted-foreground sm:text-sm">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
