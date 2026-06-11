import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ShoppingBag,
  RotateCcw,
  PackageMinus,
  PackageX,
  Star,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Severity = "info" | "warn" | "danger";

interface AttentionItem {
  label: string;
  count: number;
  href: string;
  icon: LucideIcon;
  severity: Severity;
}

const SEV: Record<Severity, string> = {
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export interface AttentionInput {
  unseenOrders: number;
  returnRequests: number;
  lowStock: number;
  outOfStock: number;
  pendingReviews: number;
  unresolvedErrors: number;
}

// "Action Center" — a single glanceable list of everything that needs a human.
// Only non-zero items render; when nothing is pending it shows an all-clear state.
export function AttentionPanel(input: AttentionInput) {
  const items: AttentionItem[] = [
    {
      label: "New orders to review",
      count: input.unseenOrders,
      href: "/dashboard/orders",
      icon: ShoppingBag,
      severity: "info",
    },
    {
      label: "Return requests",
      count: input.returnRequests,
      href: "/dashboard/orders",
      icon: RotateCcw,
      severity: "warn",
    },
    {
      label: "Out of stock",
      count: input.outOfStock,
      href: "/dashboard/products",
      icon: PackageX,
      severity: "danger",
    },
    {
      label: "Low stock",
      count: input.lowStock,
      href: "/dashboard/products",
      icon: PackageMinus,
      severity: "warn",
    },
    {
      label: "Reviews to moderate",
      count: input.pendingReviews,
      href: "/dashboard/reviews",
      icon: Star,
      severity: "info",
    },
    {
      label: "Unresolved errors",
      count: input.unresolvedErrors,
      href: "/dashboard/error-logs",
      icon: AlertTriangle,
      severity: "danger",
    },
  ];

  const active = items.filter((i) => i.count > 0);
  const totalOpen = active.reduce((s, i) => s + i.count, 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Needs attention</CardTitle>
        {totalOpen > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
            {totalOpen} open
          </span>
        )}
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CheckCircle2 className="size-8 text-emerald-500" />
            <p className="text-sm font-medium">All caught up</p>
            <p className="text-xs text-muted-foreground">
              No pending orders, returns, stock issues or reviews.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {active.map((i) => {
              const Icon = i.icon;
              return (
                <li key={i.label}>
                  <Link
                    href={i.href}
                    className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        SEV[i.severity]
                      )}
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.label}</p>
                    </div>
                    <span className="text-lg font-semibold tabular-nums">
                      {i.count}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
