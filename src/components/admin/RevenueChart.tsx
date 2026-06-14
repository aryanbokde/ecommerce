"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Period = "7d" | "30d" | "90d" | "1y";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
];

interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

const inr = (v: number) =>
  `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function formatTick(date: string, period: Period): string {
  const d = new Date(date);
  if (period === "1y") {
    return d.toLocaleDateString("en-IN", { month: "short" });
  }
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface TooltipPayload {
  payload: RevenuePoint;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">
        {new Date(point.date).toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>
      <p className="mt-1 text-muted-foreground">
        Revenue:{" "}
        <span className="font-semibold text-foreground">
          {inr(point.revenue)}
        </span>
      </p>
      <p className="text-muted-foreground">
        Orders:{" "}
        <span className="font-semibold text-foreground">{point.orders}</span>
      </p>
    </div>
  );
}

export function RevenueChart() {
  const [period, setPeriod] = useState<Period>("30d");
  // Cache per-period so switching back doesn't refetch (and so `loading` can be
  // derived rather than set synchronously inside the effect).
  const [byPeriod, setByPeriod] = useState<Record<string, RevenuePoint[]>>({});

  const data = byPeriod[period];
  const loading = data === undefined;

  useEffect(() => {
    if (byPeriod[period] !== undefined) return; // already cached
    let cancelled = false;
    fetch(`/api/admin/stats/revenue?period=${period}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then((j) => {
        if (!cancelled)
          setByPeriod((prev) => ({ ...prev, [period]: j.data ?? [] }));
      })
      .catch(() => {
        if (!cancelled) setByPeriod((prev) => ({ ...prev, [period]: [] }));
      });
    return () => {
      cancelled = true;
    };
  }, [period, byPeriod]);

  const total = (data ?? []).reduce((s, p) => s + p.revenue, 0);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Revenue</CardTitle>
          {!loading && (
            <p className="text-sm text-muted-foreground">
              {inr(total)} in the selected period
            </p>
          )}
        </div>
        <div className="flex shrink-0 rounded-lg border p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                period === p.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : data && data.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--brand-blue)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--brand-blue)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => formatTick(v, period)}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`
                  }
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: "var(--border)" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--brand-blue)"
                  strokeWidth={2}
                  fill="url(#revFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No revenue in this period yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
