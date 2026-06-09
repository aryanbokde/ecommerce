import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Accent = "primary" | "emerald" | "amber" | "blue" | "violet" | "rose";

// Icon chip color per accent. Subtle tinted background + saturated icon.
const ACCENT_CLASSES: Record<Accent, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /** Percent change vs the comparison period; sign sets the up/down arrow + color. */
  trend?: number;
  /** Context line beside/under the trend, e.g. "vs last month" or "3 pending". */
  trendLabel?: string;
  accent?: Accent;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  accent = "primary",
}: StatCardProps) {
  const hasTrend = typeof trend === "number" && Number.isFinite(trend);
  const up = (trend ?? 0) >= 0;

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {value}
          </p>
          {(hasTrend || trendLabel) && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {hasTrend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                    up
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}
                >
                  {up ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  )}
                  {Math.abs(trend as number).toFixed(1)}%
                </span>
              )}
              {trendLabel && (
                <span className="text-muted-foreground">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            ACCENT_CLASSES[accent]
          )}
        >
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}
