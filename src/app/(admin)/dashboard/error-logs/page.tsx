import type { Metadata } from "next";
import { AlertCircle, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getErrorLogs,
  getErrorStats,
} from "@/server/services/error-log.service";
import ErrorLogsClient, {
  type ErrorStats,
  type LogsResult,
} from "./ErrorLogsClient";

export const metadata: Metadata = { title: "Error Logs" };

const FALLBACK_STATS: ErrorStats = {
  total: 0,
  unresolved: 0,
  byLevel: { error: 0, warn: 0, info: 0 },
  trends: { last24h: 0, last7d: 0, last30d: 0 },
};

const FALLBACK_LOGS: LogsResult = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
};

interface PageProps {
  searchParams: Promise<{
    level?: string;
    resolved?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function ErrorLogsPage({ searchParams }: PageProps) {
  const { level, resolved, page = "1", limit = "20" } = await searchParams;

  const [stats, logsResult] = await Promise.all([
    getErrorStats().catch(() => FALLBACK_STATS),
    getErrorLogs({
      level: (level as "error" | "warn" | "info") ?? undefined,
      resolved:
        resolved === "true" ? true : resolved === "false" ? false : undefined,
      page: Math.max(1, parseInt(page, 10)),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10))),
    }).catch(() => FALLBACK_LOGS),
  ]);

  const statCards = [
    {
      label: "Total Errors",
      value: stats.total,
      icon: AlertCircle,
      className: "text-destructive",
    },
    {
      label: "Unresolved",
      value: stats.unresolved,
      icon: ShieldAlert,
      className: "text-orange-500",
    },
    {
      label: "Last 24 h",
      value: stats.trends.last24h,
      icon: AlertTriangle,
      className: "text-yellow-500",
    },
    {
      label: "Last 7 days",
      value: stats.trends.last7d,
      icon: Info,
      className: "text-blue-500",
    },
  ];

  return (
    <DashboardShell
      title="Error Logs"
      description="Monitor and resolve application errors"
    >
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} size="sm">
                <CardHeader className="flex-row items-center justify-between gap-2 pb-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                  <Icon className={`size-4 ${card.className}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">
                    {card.value.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Interactive table */}
        <ErrorLogsClient logsResult={logsResult} />
      </div>
    </DashboardShell>
  );
}
