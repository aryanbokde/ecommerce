import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Return & Refund Policy",
  description:
    "How to return an item and how refunds are processed at MyShop.",
};

const UPDATED = "5 June 2026";

const sections: LegalSection[] = [
  {
    heading: "Return window",
    body: (
      <p>
        You may request a return within <strong>7 days</strong> of delivery.
        Items must be unused, in their original condition, and with all tags and
        packaging intact.
      </p>
    ),
  },
  {
    heading: "Non-returnable items",
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Items marked &ldquo;Final Sale&rdquo; or clearance.</li>
        <li>Innerwear, personal care, and perishable goods.</li>
        <li>Products damaged through misuse after delivery.</li>
      </ul>
    ),
  },
  {
    heading: "How to start a return",
    body: (
      <p>
        Go to{" "}
        <Link
          href="/orders"
          className="text-foreground underline underline-offset-2"
        >
          Your Orders
        </Link>
        , open the relevant order, and request a return — or email{" "}
        <a
          href="mailto:support@myshop.local"
          className="text-foreground underline underline-offset-2"
        >
          support@myshop.local
        </a>{" "}
        with your order number. We&rsquo;ll arrange a pickup or share return
        instructions.
      </p>
    ),
  },
  {
    heading: "Refunds",
    body: (
      <>
        <p>
          Once we receive and inspect your return, your refund is initiated to
          your original payment method within{" "}
          <strong>5–7 business days</strong>. For Cash on Delivery orders,
          refunds are issued to your provided bank account or UPI.
        </p>
        <p>
          Shipping charges are non-refundable unless the return is due to our
          error (wrong or defective item).
        </p>
      </>
    ),
  },
  {
    heading: "Exchanges",
    body: (
      <p>
        We currently process exchanges as a return followed by a new order. If
        the item is out of stock, we&rsquo;ll issue a full refund instead.
      </p>
    ),
  },
  {
    heading: "Damaged or wrong items",
    body: (
      <p>
        Received a damaged, defective, or incorrect item? Contact us within{" "}
        <strong>48 hours</strong> of delivery with a photo and we&rsquo;ll make
        it right at no cost to you.
      </p>
    ),
  },
];

export default function ReturnsPage() {
  return (
    <LegalPage
      title="Return & Refund Policy"
      updated={UPDATED}
      intro={
        <p>
          We want you to love what you ordered. If something isn&rsquo;t right,
          here&rsquo;s how returns and refunds work at MyShop.
        </p>
      }
      sections={sections}
    />
  );
}
