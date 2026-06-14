"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifySuccess } from "@/lib/notify";

export function NewsletterSection() {
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    // TODO: wire to a real newsletter backend (e.g. POST /api/newsletter).
    notifySuccess("Subscribed!", "You're on the list — watch your inbox.");
    setEmail("");
  }

  return (
    <section className="bg-gradient-to-br from-[#FB8500] to-[#023047] py-14 text-white md:py-20">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/15">
          <Mail className="size-6" />
        </span>
        <h2 className="mt-4 font-heading text-2xl font-bold sm:text-3xl">
          Get 10% off your first order
        </h2>
        <p className="mt-2 text-sm text-white/85 sm:text-base">
          Subscribe for early access to drops, exclusive deals, and a welcome
          discount.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row"
        >
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            className="h-11 flex-1 border-white/30 bg-white/10 text-white placeholder:text-white/60"
          />
          <Button
            type="submit"
            size="lg"
            className="h-11 bg-white px-6 text-foreground transition-transform duration-300 hover:scale-105 hover:bg-white/90"
          >
            Subscribe
          </Button>
        </form>

        <p className="mt-3 text-xs text-white/70">
          We respect your privacy. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}
