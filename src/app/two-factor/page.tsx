"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { AuthShell } from "../(auth)/_components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TwoFactorPage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      setMessage("Enter your verification code.");
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const { error } = await authClient.twoFactor.verifyTotp({ code: code.trim() });
      if (error) {
        setMessage(error.message ?? "Invalid code.");
        return;
      }
      setSuccess(true);
      setMessage("Two-factor authentication verified. Redirecting...");
      window.location.href = "/";
    } catch {
      setMessage("Unable to verify the code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <div style={{ animation: "auth-fade 0.9s 0.2s both" }}>
        <h1
          style={{
            fontFamily: "var(--font-display,'system-ui',sans-serif)",
            fontSize: "2.4rem",
            lineHeight: 1.05,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          Two-factor authentication
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)", fontWeight: 300 }}>
          Enter the code from your authenticator app to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="auth-stagger mt-6 flex flex-col gap-4">
        <label className="fld-label" htmlFor="two-factor-code">
          Verification code
        </label>
        <Input
          id="two-factor-code"
          className="fld"
          inputMode="numeric"
          pattern="[0-9]*"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="123456"
          maxLength={6}
          required
        />

        {message ? (
          <p className={success ? "text-sm text-green-500" : "text-sm text-rose-400"}>
            {message}
          </p>
        ) : null}

        <Button type="submit" className="btn-primary" disabled={busy || success}>
          {busy ? <Loader2 className="animate-spin" /> : "Verify code"}
        </Button>

        <p className="mt-4 text-xs text-center" style={{ color: "var(--muted)", fontWeight: 300 }}>
          Lost access to your authenticator app? <Link href="/login" className="lnk">Sign in again</Link>.
        </p>
      </form>
    </AuthShell>
  );
}
