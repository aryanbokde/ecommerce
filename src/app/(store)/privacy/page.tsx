import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How MyShop collects, uses, and protects your personal information.",
};

const UPDATED = "5 June 2026";

const sections: LegalSection[] = [
  {
    heading: "Information we collect",
    body: (
      <>
        <p>
          We collect information you provide directly — your name, email
          address, shipping address, and phone number when you create an
          account or place an order. Payment card details are handled entirely
          by our payment partner (Razorpay) and are never stored on our servers.
        </p>
        <p>
          We also collect limited technical data automatically, such as your IP
          address, browser type, and pages visited, to keep the service secure
          and improve your experience.
        </p>
      </>
    ),
  },
  {
    heading: "How we use your information",
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>To process and deliver your orders, and send order updates.</li>
        <li>To create and secure your account and verify your email.</li>
        <li>To respond to support requests and provide customer service.</li>
        <li>To detect, prevent, and address fraud or abuse.</li>
        <li>To improve our products, content, and overall experience.</li>
      </ul>
    ),
  },
  {
    heading: "Sharing your information",
    body: (
      <p>
        We do not sell your personal information. We share data only with
        trusted service providers who help us operate — payment processing
        (Razorpay), shipping carriers, and email delivery — and only as needed
        to provide the service. We may disclose information if required by law.
      </p>
    ),
  },
  {
    heading: "Cookies",
    body: (
      <p>
        We use essential cookies to keep you signed in and to remember your cart.
        These are required for the site to function and cannot be disabled.
      </p>
    ),
  },
  {
    heading: "Data security & retention",
    body: (
      <p>
        Passwords are hashed and never stored in plain text. We retain your
        account and order data for as long as your account is active or as
        needed to comply with legal and accounting obligations.
      </p>
    ),
  },
  {
    heading: "Your rights",
    body: (
      <p>
        You may access, correct, or request deletion of your personal data, and
        update your details from your account profile at any time. To exercise
        any of these rights, contact us at{" "}
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
  {
    heading: "Contact us",
    body: (
      <p>
        Questions about this policy? Email{" "}
        <a
          href="mailto:support@myshop.local"
          className="text-foreground underline underline-offset-2"
        >
          support@myshop.local
        </a>{" "}
        or visit our{" "}
        <Link
          href="/contact"
          className="text-foreground underline underline-offset-2"
        >
          contact page
        </Link>
        .
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={UPDATED}
      intro={
        <p>
          This Privacy Policy explains how MyShop collects, uses, and protects
          your information when you use our store. By using MyShop, you agree to
          the practices described here.
        </p>
      }
      sections={sections}
    />
  );
}
