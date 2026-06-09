"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ShieldCheck,
  Shield,
  Monitor,
  LogOut,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { notifySuccess, notifyError } from "@/lib/notify";

export function SecurityTab() {
  return (
    <div className="flex max-w-lg flex-col gap-8">
      <PasswordSection />
      <Separator />
      <TwoFactorSection />
      <Separator />
      <SessionsSection />
    </div>
  );
}

// ── Change password ─────────────────────────────────────────────────────────
function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      notifyError("Password too short", "Use at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      notifyError("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: false,
      });
      if (error) {
        notifyError("Couldn't change password", error.message);
        return;
      }
      notifySuccess("Password changed");
      setCurrent("");
      setNext("");
      setConfirm("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">Change password</h2>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="current-pw">Current password</Label>
          <Input
            id="current-pw"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-pw">New password</Label>
          <Input
            id="new-pw"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-pw">Confirm new password</Label>
          <Input
            id="confirm-pw"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <div>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            Update password
          </Button>
        </div>
      </form>
    </section>
  );
}

// ── Two-factor authentication ─────────────────────────────────────────────────
function TwoFactorSection() {
  const { user } = useAuth();
  // Reflect the session value until the user enables/disables here, at which
  // point the override wins (avoids syncing session → state inside an effect).
  const [override, setOverride] = useState<boolean | null>(null);
  const enabled = override ?? !!user?.twoFactorEnabled;

  // Setup flow state.
  const [stage, setStage] = useState<"idle" | "password" | "verify">("idle");
  const [password, setPassword] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  function resetSetup() {
    setStage("idle");
    setPassword("");
    setQr(null);
    setBackupCodes([]);
    setCode("");
  }

  async function startEnable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await authClient.twoFactor.enable({ password });
      if (error || !data) {
        notifyError("Couldn't start 2FA setup", error?.message);
        return;
      }
      // Render the TOTP QR (lazy-load the lib so it's not in the main bundle).
      const { toDataURL } = await import("qrcode");
      setQr(await toDataURL(data.totpURI));
      setBackupCodes(data.backupCodes ?? []);
      setStage("verify");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await authClient.twoFactor.verifyTotp({ code });
      if (error) {
        notifyError("Invalid code", error.message);
        return;
      }
      notifySuccess("Two-factor authentication enabled");
      setOverride(true);
      resetSetup();
    } finally {
      setBusy(false);
    }
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await authClient.twoFactor.disable({ password });
      if (error) {
        notifyError("Couldn't disable 2FA", error.message);
        return;
      }
      notifySuccess("Two-factor authentication disabled");
      setOverride(false);
      resetSetup();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2">
        {enabled ? (
          <ShieldCheck className="size-5 text-green-600" />
        ) : (
          <Shield className="size-5 text-muted-foreground" />
        )}
        <h2 className="text-base font-semibold text-foreground">
          Two-factor authentication
        </h2>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold",
            enabled ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
          )}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {/* Enabled → offer disable (password-confirmed) */}
      {enabled && stage === "idle" && (
        <form onSubmit={disable} className="mt-4 flex items-end gap-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="disable-2fa-pw">Confirm password to disable</Label>
            <Input
              id="disable-2fa-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="destructive" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            Disable
          </Button>
        </form>
      )}

      {/* Disabled, idle → start */}
      {!enabled && stage === "idle" && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Add a second step at sign-in using an authenticator app.
          </p>
          <Button className="mt-3" onClick={() => setStage("password")}>
            Enable 2FA
          </Button>
        </div>
      )}

      {/* Step 1: confirm password */}
      {!enabled && stage === "password" && (
        <form onSubmit={startEnable} className="mt-4 flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="enable-2fa-pw">Confirm your password</Label>
            <Input
              id="enable-2fa-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Continue
            </Button>
            <Button type="button" variant="ghost" onClick={resetSetup}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Step 2: scan QR + save backup codes + verify */}
      {!enabled && stage === "verify" && (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Scan this QR code with your authenticator app, then enter the 6-digit
            code to finish.
          </p>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt="Two-factor QR code"
              className="size-44 rounded-lg border border-border"
            />
          )}

          {backupCodes.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs font-medium text-foreground">
                Backup codes — save these somewhere safe:
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-xs text-muted-foreground">
                {backupCodes.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={verifyEnable} className="flex items-end gap-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="totp-code">Verification code</Label>
              <Input
                id="totp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Verify &amp; enable
            </Button>
          </form>
          <Button type="button" variant="ghost" className="self-start" onClick={resetSetup}>
            Cancel
          </Button>
        </div>
      )}
    </section>
  );
}

// ── Active sessions ───────────────────────────────────────────────────────────
interface SessionRow {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  createdAt: string;
  updatedAt: string;
  current: boolean;
}

function deviceLabel(s: SessionRow): string {
  if (s.deviceType) return s.deviceType;
  const ua = s.userAgent ?? "";
  if (/mobile/i.test(ua)) return "Mobile device";
  const m = ua.match(/(Edg|Chrome|Firefox|Safari)/i);
  return m ? `${m[1]} browser` : "Unknown device";
}

function SessionsSection() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/users/me/sessions", {
          credentials: "include",
        });
        const json = res.ok ? await res.json() : null;
        if (!cancelled) setSessions(json?.data ?? []);
      } catch {
        if (!cancelled) setSessions([]);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  async function revoke(id: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/users/me/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        notifyError("Couldn't revoke session", json?.error);
        return;
      }
      notifySuccess("Session revoked");
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function revokeAllOthers() {
    setRevokingAll(true);
    try {
      const res = await fetch("/api/users/me/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ allOthers: true }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        notifyError("Couldn't log out other devices", json?.error);
        return;
      }
      notifySuccess("Logged out of other devices");
      refresh();
    } finally {
      setRevokingAll(false);
    }
  }

  const others = (sessions ?? []).filter((s) => !s.current).length;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">Active sessions</h2>

      {sessions === null ? (
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <Monitor className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {deviceLabel(s)}
                    {s.current && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.ipAddress ?? "Unknown IP"} · last active{" "}
                    {new Date(s.updatedAt).toLocaleString("en-IN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {!s.current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === s.id}
                    onClick={() => revoke(s.id)}
                  >
                    {busyId === s.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Revoke"
                    )}
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {others > 0 && (
            <Button
              variant="outline"
              className="mt-3"
              disabled={revokingAll}
              onClick={revokeAllOthers}
            >
              {revokingAll ? <Loader2 className="animate-spin" /> : <LogOut />}
              Log out all other devices
            </Button>
          )}
        </>
      )}
    </section>
  );
}
