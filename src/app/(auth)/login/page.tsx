import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../_components/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign In",
};

const FD = "var(--font-display,'system-ui',sans-serif)";

export default function LoginPage() {
  return (
    <AuthShell>
      {/* Heading */}
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
          Welcome back
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)", fontWeight: 300 }}>
          Sign in to continue to your marketplace.
        </p>
      </div>

      {/* Form (client component — calls authClient.signIn.email) */}
      <LoginForm />

      {/* Footer */}
      <p
        className="mt-7 text-xs text-center"
        style={{ color: "var(--muted)", fontWeight: 300, animation: "auth-fade 0.9s 0.78s both" }}
      >
        New to Bazaar?{" "}
        <Link href="/register" className="lnk" style={{ fontWeight: 400 }}>
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
