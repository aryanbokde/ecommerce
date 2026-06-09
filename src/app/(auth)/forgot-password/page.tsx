import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../_components/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
};

const FD = "var(--font-display,'system-ui',sans-serif)";

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <div style={{ animation: "auth-fade 0.9s 0.2s both" }}>
        <h1
          style={{
            fontFamily: FD,
            fontSize: "2.4rem",
            lineHeight: 1.05,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          Reset password
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)", fontWeight: 300 }}>
          Enter your email and we&apos;ll send you a link to get back in.
        </p>
      </div>

      <ForgotPasswordForm />

      <p
        className="mt-7 text-xs text-center"
        style={{ color: "var(--muted)", fontWeight: 300, animation: "auth-fade 0.9s 0.6s both" }}
      >
        Remembered it?{" "}
        <Link href="/login" className="lnk" style={{ fontWeight: 400 }}>
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
