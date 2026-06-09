"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

// Client form for the password-reset request. Server-component page shells can't
// submit safely (a plain <form> GET-submits the email into the URL and reloads
// with no feedback). This POSTs via better-auth and shows a neutral success
// message (no account enumeration).
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    setLoading(false);

    if (error) {
      const message = error.message ?? "Couldn't send the reset link.";
      setError(message);
      toast.error(message);
      return;
    }

    // Neutral message regardless of whether the email exists.
    setSent(true);
    toast.success("Check your email", {
      description: "If an account exists, a reset link is on its way.",
    });
  }

  if (sent) {
    return (
      <p
        className="auth-stagger mt-8 text-sm"
        style={{ color: "var(--muted)", fontWeight: 300 }}
        role="status"
      >
        If an account exists for <strong>{email}</strong>, we&apos;ve sent a
        password-reset link. Check your inbox (and spam).
      </p>
    );
  }

  return (
    <form
      className="auth-stagger mt-8 flex flex-col gap-4"
      method="post"
      onSubmit={onSubmit}
      noValidate
    >
      <div>
        <label htmlFor="email" className="fld-label">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          className="fld"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-xs"
          style={{ color: "var(--accent)", marginTop: -4 }}
        >
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary mt-1" disabled={loading}>
        {loading ? "Sending…" : "Send Reset Link"}
      </button>
    </form>
  );
}
