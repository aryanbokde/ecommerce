"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useCart } from "@/hooks/useCart";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  recordLoginBlocked,
} from "./actions";

// Landing page per role after login (when no explicit ?redirect= is present).
// Route groups map: (admin)→/dashboard, (shop-manager)→/shop-manager/dashboard,
// (support)→/support/dashboard, customers → storefront home.
function dashboardForRole(role: string | null | undefined): string {
  switch (role) {
    case "admin":
      return "/dashboard";
    case "shop_manager":
      return "/shop-manager/dashboard";
    case "support":
      return "/support/dashboard";
    default:
      return "/";
  }
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Rate-limit pre-check: block before hitting the auth endpoint.
    const { blocked } = await checkLoginRateLimit(email);
    if (blocked) {
      await recordLoginBlocked(email);
      const message =
        "Too many failed attempts. Please wait a few minutes and try again.";
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    const { error } = await authClient.signIn.email({ email, password });

    if (error) {
      setLoading(false);
      // Record the failure server-side so rate limiting has complete data.
      await recordLoginFailure(email);
      const message = error.message ?? "Unable to sign in. Please try again.";
      setError(message);
      toast.error(message);
      return;
    }

    // Resolve the freshly-created session to route by role. getSession reads the
    // just-set cookie reliably (the signIn payload's user type omits our custom
    // role field on the client).
    const session = await authClient.getSession();
    const role = session.data?.user?.role;

    // Deactivated accounts can still authenticate (isActive is our field, not
    // better-auth's ban). Sign them straight back out with a clear reason rather
    // than letting them land on a /403 with no explanation.
    if (session.data?.user && (session.data.user as { isActive?: boolean }).isActive === false) {
      await authClient.signOut();
      setLoading(false);
      const message = "Your account has been suspended. Contact support.";
      setError(message);
      toast.error(message);
      return;
    }

    // Carry any logged-out (guest) cart into the user's DB cart, then clear it.
    await useCart.getState().mergeGuestIntoServer();

    setLoading(false);
    toast.success("Signed in");

    // Honour ?redirect=… (e.g. login-gated checkout) first; otherwise send each
    // role to its own dashboard, and customers to the storefront home.
    const redirectParam = new URLSearchParams(window.location.search).get(
      "redirect"
    );
    router.push(redirectParam || dashboardForRole(role));
    router.refresh();
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

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="password" className="fld-label" style={{ margin: 0 }}>
            Password
          </label>
          <Link href="/forgot-password" className="lnk text-[11px]">
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          name="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
          className="fld"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        {loading ? "Signing in…" : "Sign In"}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4 my-1" aria-hidden="true">
        <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
        <span className="text-[11px]" style={{ color: "#6f6f7d" }}>
          or
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
      </div>

      <button type="button" className="btn-ghost" disabled={loading}>
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.392 17.64 12.084 17.64 9.2z" fill="#4285F4" />
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>
    </form>
  );
}
