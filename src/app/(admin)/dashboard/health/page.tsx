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

export default function HealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<ErrLog[] | null>(null);
  const [vitals, setVitals] = useState<
    Record<string, { value: number; rating: string }>
  >({});

  const loadHealth = useCallback(async () => {
    // Note: `refreshing` is set by the manual button, not here — setting state
    // synchronously at the top of an effect-invoked callback is discouraged.
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const json = (await res.json()) as Health;
      setHealth(json);
      setHealthError(false);
    } catch {
      setHealthError(true);
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
          <span className="text-xs opacity-80">
            {updatedAt
              ? `Updated ${updatedAt.toLocaleTimeString("en-IN")}`
              : "Checking…"}
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
