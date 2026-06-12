"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { notifySuccess } from "@/lib/notify";

// Footer newsletter signup. UI only — intentionally NOT wired to a backend.
// Lives as a small client island so the footer itself stays a server component.
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setDone(true);
    notifySuccess("You're subscribed!", "Look out for our next drop.");
    setEmail("");
    window.setTimeout(() => setDone(false), 2500);
  }

  return (
    <form onSubmit={submit} className="mt-6 max-w-xs">
      <p className="text-sm font-medium text-foreground">Stay in the loop</p>
      <p className="mt-1 text-xs text-muted-foreground">
        New arrivals and offers, straight to your inbox.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          aria-label="Email address"
          className="h-9"
        />
        <button
          type="submit"
          aria-label="Subscribe"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/25",
            done ? "bg-green-600" : "bg-primary"
          )}
        >
          {done ? (
            <Check className="size-4" />
          ) : (
            <ArrowRight className="size-4" />
          )}
        </button>
      </div>
    </form>
  );
}
