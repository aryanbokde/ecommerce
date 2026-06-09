import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "../_components/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Set New Password",
};

const FD = "var(--font-display,'system-ui',sans-serif)";

export default function ResetPasswordPage() {
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
          Set new password
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)", fontWeight: 300 }}>
          Choose a strong password you don&apos;t use anywhere else.
        </p>
      </div>

      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
