import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Clock, MapPin, LifeBuoy } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the MyShop support team.",
};

const CARDS = [
  {
    icon: Mail,
    title: "Email us",
    lines: ["support@myshop.local"],
    href: "mailto:support@myshop.local",
  },
  {
    icon: Clock,
    title: "Support hours",
    lines: ["Mon–Sat, 9:00 AM – 7:00 PM IST", "We reply within 24 hours"],
  },
  {
    icon: MapPin,
    title: "Address",
    lines: ["MyShop Pvt. Ltd.", "Bengaluru, Karnataka, India"],
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <header className="border-b border-border pb-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Contact Us
        </h1>
        <p className="mt-2 text-[15px] leading-7 text-muted-foreground">
          Have a question about an order or need a hand? We&rsquo;re here to
          help.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CARDS.map((c) => {
          const Icon = c.icon;
          const inner = (
            <>
              <Icon className="size-5 text-primary" />
              <h2 className="mt-3 text-sm font-semibold text-foreground">
                {c.title}
              </h2>
              {c.lines.map((l) => (
                <p key={l} className="mt-1 text-sm text-muted-foreground">
                  {l}
                </p>
              ))}
            </>
          );
          return c.href ? (
            <a
              key={c.title}
              href={c.href}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20"
            >
              {inner}
            </a>
          ) : (
            <div
              key={c.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              {inner}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-5">
        <LifeBuoy className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="text-sm leading-6 text-muted-foreground">
          <p className="font-medium text-foreground">Order-related queries</p>
          <p className="mt-1">
            For the fastest help with an existing order, include your order
            number. You can find it under{" "}
            <Link
              href="/orders"
              className="text-foreground underline underline-offset-2"
            >
              Your Orders
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
