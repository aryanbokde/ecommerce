"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { onCLS, onFCP, onLCP, type Metric } from "web-vitals";
import {
  RefreshCw,
  Database,
  MemoryStick,
  Clock,
  Tag,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Server,
  HardDrive,
  Mail,
  Boxes,
  ShoppingCart,
  Users,
} from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Health {
  status: "ok" | "degraded" | "error";
  version: string;
  checks: {
    database: { status: "ok" | "down"; responseTime: number };
    memory: { used: number; total: number };
    uptime: number;
  };
}

interface ErrLog {
  id: string;
  level?: string;
  message?: string;
  createdAt?: string;
}

interface Diagnostics {
  runtime: { node: string; env: string; platform: string; nextRuntime: string };
  services: { database: string; storage: string; email: string };
  config: {
    database: boolean;
    authSecret: boolean;
    sentry: boolean;
    cloudinary: boolean;
    appUrl: string | null;
  };
  counts: {
    products: number;
    orders: number;
    users: number;
    unresolvedErrors: number;
  };
}

type Overall = "operational" | "degraded" | "down";

const BANNER: Record<
  Overall,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  operational: {
    label: "All systems operational",
    className:
      "border-green-200 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300",
    icon: CheckCircle2,
  },
  degraded: {
    label: "Degraded performance",
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    icon: AlertTriangle,
  },
  down: {
    label: "Service disruption",
    className:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    icon: XCircle,
  },
};

function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

interface Sample {
  db: number; // DB response time (ms)
  memPct: number; // heap used %
  ok: boolean; // poll resolved healthy
}

// Tiny bar sparkline for a series of values (oldest → newest).
function Sparkline({
  values,
  colorFor,
}: {
  values: number[];
  colorFor: (v: number) => string;
}) {
  if (values.length === 0)
    return (
      <div className="flex h-14 items-center justify-center text-xs text-muted-foreground">
        Collecting samples…
      </div>
    );
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-14 items-end gap-0.5">
      {values.map((v, i) => (
        <div
          key={i}
          title={String(v)}
          className={cn("min-w-[3px] flex-1 rounded-sm", colorFor(v))}
          style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

// Display + rating for a Core Web Vital.
const VITAL_META: Record<string, { label: string; format: (v: number) => string }> = {
  CLS: { label: "CLS", format: (v) => v.toFixed(3) },
  LCP: { label: "LCP", format: (v) => `${(v / 1000).toFixed(2)}s` },
  FCP: { label: "FCP", format: (v) => `${(v / 1000).toFixed(2)}s` },
};

const RATING_COLOR: Record<string, string> = {
  good: "text-green-600",
  "needs-improvement": "text-amber-600",
  poor: "text-red-600",
};

function CountTile({
  icon: Icon,
  label,
  value,
  alert = false,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <Icon
            className={cn(
              "size-4",
              alert ? "text-destructive" : "text-muted-foreground"
            )}
          />
        </div>
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums",
            alert ? "text-destructive" : "text-foreground"
          )}
        >
          {value.toLocaleString("en-IN")}
        </p>
      </CardContent>
    </Card>
  );
}

function KV({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </span>
      <span className="truncate font-medium capitalize text-foreground">
        {value}
      </span>
    </div>
  );
}

function ConfigRow({
  label,
  ok,
  optional = false,
}: {
  label: string;
  ok: boolean;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      {ok ? (
        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
          <CheckCircle2 className="size-4" />
          Configured
        </span>
      ) : (
        <span
          className={cn(
            "inline-flex items-center gap-1",
            optional ? "text-muted-foreground" : "text-destructive"
          )}
        >
          <XCircle className="size-4" />
          {optional ? "Not set" : "Missing"}
        </span>
      )}
    </div>
  );
}

export default function HealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<ErrLog[] | null>(null);
  const [vitals, setVitals] = useState<
    Record<string, { value: number; rating: string }>
  >({});
  const [history, setHistory] = useState<Sample[]>([]);
  const [diag, setDiag] = useState<Diagnostics | null>(null);

  const loadHealth = useCallback(async () => {
    // Note: `refreshing` is set by the manual button, not here — setting state
    // synchronously at the top of an effect-invoked callback is discouraged.
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const json = (await res.json()) as Health;
      setHealth(json);
      setHealthError(false);
      // Accumulate a rolling window of samples for the trend sparklines.
      const m = json.checks.memory;
      const memPct = m.total > 0 ? Math.round((m.used / m.total) * 100) : 0;
      setHistory((h) =>
        [
          ...h,
          {
            db: json.checks.database.responseTime,
            memPct,
            ok: json.status === "ok",
          },
        ].slice(-30)
      );
    } catch {
      setHealthError(true);
      setHistory((h) => [...h, { db: 0, memPct: 0, ok: false }].slice(-30));
    } finally {
      setUpdatedAt(new Date());
      setRefreshing(false);
    }
  }, []);

  // Poll health every 30s. Both the first load and the interval run via timers
  // (callbacks), so no setState is called synchronously inside the effect body.
  useEffect(() => {
    const first = setTimeout(loadHealth, 0);
    const id = setInterval(loadHealth, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [loadHealth]);

  // Recent errors (one-shot).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/error-logs?limit=5", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        if (!cancelled) setErrors(j.logs ?? []);
      })
      .catch(() => {
        if (!cancelled) setErrors([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Admin-only diagnostics (runtime / services / config / counts), one-shot.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/diagnostics", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        if (!cancelled && j?.data) setDiag(j.data as Diagnostics);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Live Core Web Vitals for this session.
  useEffect(() => {
    let cancelled = false;
    const update = (m: Metric) => {
      if (!cancelled)
        setVitals((v) => ({
          ...v,
          [m.name]: { value: m.value, rating: m.rating },
        }));
    };
    onCLS(update);
    onLCP(update);
    onFCP(update);
    return () => {
      cancelled = true;
    };
  }, []);

  const overall: Overall = healthError
    ? "down"
    : health?.status === "error"
      ? "down"
      : health?.status === "degraded"
        ? "degraded"
        : "operational";
  const banner = BANNER[overall];
  const BannerIcon = banner.icon;

  const db = health?.checks.database;
  const mem = health?.checks.memory;
  const memPct = mem && mem.total > 0 ? Math.round((mem.used / mem.total) * 100) : 0;

  // Session trend derivations from the rolling sample window.
  const dbSeries = history.map((s) => s.db);
  const memSeries = history.map((s) => s.memPct);
  const okCount = history.filter((s) => s.ok).length;
  const availability =
    history.length > 0 ? Math.round((okCount / history.length) * 100) : null;
  const dbAvg =
    dbSeries.length > 0
      ? Math.round(dbSeries.reduce((a, b) => a + b, 0) / dbSeries.length)
      : 0;
  const dbMax = dbSeries.length > 0 ? Math.max(...dbSeries) : 0;
  const dbColor = (v: number) =>
    v < 100 ? "bg-green-500" : v < 300 ? "bg-amber-500" : "bg-red-500";
  const memColor = (v: number) =>
    v < 75 ? "bg-primary" : v < 90 ? "bg-amber-500" : "bg-red-500";

  return (
    <DashboardShell
      title="Site Health"
      description="Live system status and performance"
      action={
        <Button
          variant="outline"
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true);
            loadHealth();
          }}
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          Refresh now
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Status banner */}
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border px-4 py-3",
            banner.className
          )}
        >
          <span className="flex items-center gap-2 font-medium">
            <BannerIcon className="size-5" />
            {banner.label}
          </span>
          <span className="flex items-center gap-3 text-xs opacity-80">
            {availability !== null && (
              <span className="tabular-nums">{availability}% uptime · session</span>
            )}
            <span>
              {updatedAt
                ? `Updated ${updatedAt.toLocaleTimeString("en-IN")}`
                : "Checking…"}
            </span>
          </span>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Database */}
          <Card>
            <CardContent className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Database
                </p>
                <Database className="size-4 text-muted-foreground" />
              </div>
              <p
                className={cn(
                  "text-2xl font-semibold",
                  db?.status === "ok"
                    ? "text-green-600"
                    : db?.status === "down"
                      ? "text-red-600"
                      : "text-foreground"
                )}
              >
                {db ? (db.status === "ok" ? "Healthy" : "Down") : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {db ? `${db.responseTime} ms response` : "Awaiting check"}
              </p>
            </CardContent>
          </Card>

          {/* Memory */}
          <Card>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Memory
                </p>
                <MemoryStick className="size-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {mem ? `${mem.used}` : "—"}
                {mem && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {mem.total} MB
                  </span>
                )}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    memPct > 90
                      ? "bg-red-500"
                      : memPct > 75
                        ? "bg-amber-500"
                        : "bg-primary"
                  )}
                  style={{ width: `${memPct}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Uptime */}
          <Card>
            <CardContent className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Uptime
                </p>
                <Clock className="size-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {health ? fmtUptime(health.checks.uptime) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Since last deploy</p>
            </CardContent>
          </Card>

          {/* Version */}
          <Card>
            <CardContent className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  App version
                </p>
                <Tag className="size-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {health ? `v${health.version}` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Current build</p>
            </CardContent>
          </Card>
        </div>

        {/* Session trends */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* DB latency history */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Database latency</CardTitle>
              <span className="text-xs text-muted-foreground tabular-nums">
                {db ? `${db.responseTime} ms now` : "—"}
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              <Sparkline values={dbSeries} colorFor={dbColor} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>avg {dbAvg} ms</span>
                <span>peak {dbMax} ms</span>
                <span>{history.length} samples</span>
              </div>
            </CardContent>
          </Card>

          {/* Memory history */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Memory usage</CardTitle>
              <span className="text-xs text-muted-foreground tabular-nums">
                {mem ? `${memPct}% now` : "—"}
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              <Sparkline values={memSeries} colorFor={memColor} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {mem ? `${mem.used} / ${mem.total} MB` : "—"}
                </span>
                <span>{history.length} samples</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Diagnostics: counts + environment + config (admin-only API) */}
        {diag && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <CountTile icon={Boxes} label="Products" value={diag.counts.products} />
              <CountTile
                icon={ShoppingCart}
                label="Orders"
                value={diag.counts.orders}
              />
              <CountTile icon={Users} label="Users" value={diag.counts.users} />
              <CountTile
                icon={AlertCircle}
                label="Unresolved errors"
                value={diag.counts.unresolvedErrors}
                alert={diag.counts.unresolvedErrors > 0}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Environment & services */}
              <Card>
                <CardHeader>
                  <CardTitle>Environment &amp; services</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  <KV
                    icon={Server}
                    label="Runtime"
                    value={`Node ${diag.runtime.node} · ${diag.runtime.platform}`}
                  />
                  <KV
                    icon={Tag}
                    label="Environment"
                    value={diag.runtime.env}
                  />
                  <KV
                    icon={Database}
                    label="Database"
                    value={diag.services.database}
                  />
                  <KV
                    icon={HardDrive}
                    label="Storage"
                    value={diag.services.storage}
                  />
                  <KV icon={Mail} label="Email" value={diag.services.email} />
                </CardContent>
              </Card>

              {/* Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ConfigRow label="Database URL" ok={diag.config.database} />
                  <ConfigRow label="Auth secret" ok={diag.config.authSecret} />
                  <ConfigRow
                    label="Cloudinary"
                    ok={diag.config.cloudinary}
                    optional
                  />
                  <ConfigRow label="Sentry DSN" ok={diag.config.sentry} optional />
                  {diag.config.appUrl && (
                    <p className="pt-1 text-xs text-muted-foreground">
                      App URL:{" "}
                      <span className="font-mono">{diag.config.appUrl}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent errors */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent errors</CardTitle>
              <Link
                href="/dashboard/error-logs"
                className="inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                View all
                <ChevronRight className="size-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {errors === null ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Loading…
                </p>
              ) : errors.length === 0 ? (
                <p className="flex items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-green-600" />
                  No recent errors logged.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {errors.slice(0, 5).map((e) => (
                    <li key={e.id} className="flex items-start gap-2 py-2.5">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          {e.message ?? "Unknown error"}
                        </p>
                        {e.createdAt && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(e.createdAt).toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Web vitals */}
          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {(["CLS", "LCP", "FCP"] as const).map((name) => {
                  const meta = VITAL_META[name];
                  const v = vitals[name];
                  return (
                    <div key={name} className="text-center">
                      <p className="text-xs font-medium text-muted-foreground">
                        {meta.label}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xl font-semibold tabular-nums",
                          v ? RATING_COLOR[v.rating] ?? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {v ? meta.format(v.value) : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Measured live in your current session.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
