"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

// Reset-password landing form. The emailed link points here with ?token=…
// (better-auth). User sets a new password → resetPassword(token) → /login.
export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No token → the link is malformed/expired; nothing to reset.
  if (!token) {
    return (
      <p
        className="auth-stagger mt-8 text-sm"
        style={{ color: "var(--muted)", fontWeight: 300 }}
        role="alert"
      >
        This reset link is invalid or has expired.{" "}
        <Link href="/forgot-password" className="lnk" style={{ fontWeight: 400 }}>
          Request a new one
        </Link>
        .
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token: token!,
    });
    setLoading(false);

    if (error) {
      const message = error.message ?? "Couldn't reset your password.";
      setError(message);
      toast.error(message);
      return;
    }

    toast.success("Password updated", { description: "Sign in with your new password." });
    router.push("/login");
  }

  return (
    <form
      className="auth-stagger mt-8 flex flex-col gap-4"
      method="post"
      onSubmit={onSubmit}
      noValidate
    >
      <div>
        <label htmlFor="password" className="fld-label">
          New Password
        </label>
        <input
          id="password"
          type="password"
          name="password"
          placeholder="At least 8 characters"
          required
          autoComplete="new-password"
          className="fld"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="confirm" className="fld-label">
          Confirm Password
        </label>
        <input
          id="confirm"
          type="password"
          name="confirm"
          placeholder="Re-enter your password"
          required
          autoComplete="new-password"
          className="fld"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
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
        {loading ? "Updating…" : "Reset Password"}
      </button>
    </form>
  );
}
