import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../_components/auth-shell";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create Account",
};

const FD = "var(--font-display,'system-ui',sans-serif)";

export default function RegisterPage() {
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
          Create account
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)", fontWeight: 300 }}>
          Join 2M+ shoppers discovering the world&apos;s finest vendors.
        </p>
      </div>

      <RegisterForm />

      <p
        className="mt-7 text-xs text-center"
        style={{ color: "var(--muted)", fontWeight: 300, animation: "auth-fade 0.9s 0.78s both" }}
      >
        Already have an account?{" "}
        <Link href="/login" className="lnk" style={{ fontWeight: 400 }}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
