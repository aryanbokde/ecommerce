import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: "Delivery timelines, charges, and tracking for MyShop orders.",
};

const UPDATED = "5 June 2026";

const sections: LegalSection[] = [
  {
    heading: "Processing time",
    body: (
      <p>
        Orders are processed within <strong>1–2 business days</strong>.
        You&rsquo;ll receive an email confirmation when your order is placed and
        again when it ships.
      </p>
    ),
  },
  {
    heading: "Delivery timelines",
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Metro cities: 2–4 business days.</li>
        <li>Other locations: 4–7 business days.</li>
        <li>Remote areas may take a little longer.</li>
      </ul>
    ),
  },
  {
    heading: "Shipping charges",
    body: (
      <p>
        Shipping is <strong>free on orders over ₹999</strong>. A flat fee of{" "}
        <strong>₹99</strong> applies to orders below that threshold. Any
        applicable charges are shown at checkout before you pay.
      </p>
    ),
  },
  {
    heading: "Order tracking",
    body: (
      <p>
        Once your order ships, we&rsquo;ll email you a tracking number. You can
        also track status anytime under{" "}
        <Link
          href="/orders"
          className="text-foreground underline underline-offset-2"
        >
          Your Orders
        </Link>
        .
      </p>
    ),
  },
  {
    heading: "Delays",
    body: (
      <p>
        Deliveries may occasionally be delayed by weather, carrier issues, or
        public holidays. If your order is significantly delayed, contact{" "}
        <a
          href="mailto:support@myshop.local"
          className="text-foreground underline underline-offset-2"
        >
          support@myshop.local
        </a>{" "}
        and we&rsquo;ll help.
      </p>
    ),
  },
];

export default function ShippingPage() {
  return (
    <LegalPage
      title="Shipping Policy"
      updated={UPDATED}
      intro={
        <p>
          Here&rsquo;s everything you need to know about how and when your MyShop
          order reaches you.
        </p>
      }
      sections={sections}
    />
  );
}
