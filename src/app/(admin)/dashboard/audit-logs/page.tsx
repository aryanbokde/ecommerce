import type { Metadata } from "next";
import { Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAuditLogs,
  getAuditStats,
  type AuditAction,
  type AuditStatus,
} from "@/server/services/audit-log.service";
import AuditLogsClient, {
  type AuditLogsResult,
} from "./AuditLogsClient";

export const metadata: Metadata = { title: "Audit Logs" };

const FALLBACK_STATS = {
  total: 0,
  byStatus: { success: 0, failed: 0, blocked: 0 },
  trends: { last24h: 0, last7d: 0 },
};

const FALLBACK_LOGS: AuditLogsResult = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
};

interface PageProps {
  searchParams: Promise<{
    action?: string;
    status?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function AuditLogsPage({ searchParams }: PageProps) {
  const { action, status, page = "1", limit = "20" } = await searchParams;

  const [stats, logsResult] = await Promise.all([
    getAuditStats().catch(() => FALLBACK_STATS),
    getAuditLogs({
      action: (action as AuditAction) ?? undefined,
      status: (status as AuditStatus) ?? undefined,
      page: Math.max(1, parseInt(page, 10)),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10))),
    }).catch(() => FALLBACK_LOGS),
  ]);

  const statCards = [
    {
      label: "Total Events",
      value: stats.total,
      icon: Activity,
      className: "text-blue-500",
    },
    {
      label: "Successful",
      value: stats.byStatus.success,
      icon: CheckCircle2,
      className: "text-green-500",
    },
    {
      label: "Failed / Blocked",
      value: stats.byStatus.failed + stats.byStatus.blocked,
      icon: XCircle,
      className: "text-destructive",
    },
    {
      label: "Last 24 h",
      value: stats.trends.last24h,
      icon: Clock,
      className: "text-yellow-500",
    },
  ];

  return (
    <DashboardShell
      title="Audit Logs"
      description="Security & activity trail — who did what, when, and from where"
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
        <AuditLogsClient logsResult={logsResult} />
      </div>
    </DashboardShell>
  );
}
