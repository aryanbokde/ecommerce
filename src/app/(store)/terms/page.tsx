import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms and conditions for using MyShop and placing orders.",
};

const UPDATED = "5 June 2026";

const sections: LegalSection[] = [
  {
    heading: "Acceptance of terms",
    body: (
      <p>
        By accessing or using MyShop, you agree to be bound by these Terms of
        Service. If you do not agree, please do not use the store.
      </p>
    ),
  },
  {
    heading: "Your account",
    body: (
      <p>
        You are responsible for keeping your account credentials secure and for
        all activity under your account. You must provide accurate information
        and verify your email address. We may suspend accounts that violate
        these terms or engage in fraudulent activity.
      </p>
    ),
  },
  {
    heading: "Orders & pricing",
    body: (
      <>
        <p>
          All prices are listed in Indian Rupees (₹) and include applicable
          taxes unless stated otherwise. We make every effort to display
          accurate prices and availability, but errors can occur.
        </p>
        <p>
          We reserve the right to cancel or refuse any order — including orders
          with pricing errors or suspected fraud — and will refund any amount
          already charged.
        </p>
      </>
    ),
  },
  {
    heading: "Payments",
    body: (
      <p>
        Payments are processed securely by Razorpay. By placing an order you
        authorise us to charge your selected payment method for the order total,
        including shipping and taxes. Cash on Delivery is available on eligible
        orders.
      </p>
    ),
  },
  {
    heading: "Shipping, returns & refunds",
    body: (
      <p>
        Delivery timelines, return eligibility, and refund handling are governed
        by our{" "}
        <Link
          href="/shipping"
          className="text-foreground underline underline-offset-2"
        >
          Shipping Policy
        </Link>{" "}
        and{" "}
        <Link
          href="/returns"
          className="text-foreground underline underline-offset-2"
        >
          Return &amp; Refund Policy
        </Link>
        , which form part of these terms.
      </p>
    ),
  },
  {
    heading: "Intellectual property",
    body: (
      <p>
        All content on MyShop — including text, graphics, logos, and product
        imagery — is owned by MyShop or its licensors and may not be reused
        without permission.
      </p>
    ),
  },
  {
    heading: "Limitation of liability",
    body: (
      <p>
        MyShop is provided on an &ldquo;as is&rdquo; basis. To the maximum extent
        permitted by law, we are not liable for any indirect or consequential
        damages arising from your use of the store.
      </p>
    ),
  },
  {
    heading: "Changes to these terms",
    body: (
      <p>
        We may update these terms from time to time. Continued use of MyShop
        after changes take effect constitutes acceptance of the revised terms.
      </p>
    ),
  },
  {
    heading: "Contact",
    body: (
      <p>
        Questions about these terms? Email{" "}
        <a
          href="mailto:support@myshop.local"
          className="text-foreground underline underline-offset-2"
        >
          support@myshop.local
        </a>
        .
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={UPDATED}
      intro={
        <p>
          Please read these Terms of Service carefully before using MyShop. They
          set out the rules for using our store and placing orders.
        </p>
      }
      sections={sections}
    />
  );
}
