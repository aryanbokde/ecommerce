"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface StatusDatum {
  status: string;
  count: number;
}

// Concrete colors mirroring OrderStatusBadge's tailwind classes (which only
// expose class names, not values usable by an SVG fill).
const STATUS_COLOR: Record<string, string> = {
  pending: "#6b7280", // gray-500
  confirmed: "#3b82f6", // blue-500
  processing: "#f59e0b", // amber-500
  shipped: "#8b5cf6", // violet-500
  delivered: "#22c55e", // green-500
  cancelled: "#ef4444", // red-500
};

const colorFor = (status: string) => STATUS_COLOR[status] ?? "#94a3b8";

interface TooltipPayload {
  payload: StatusDatum;
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <span className="font-medium capitalize text-foreground">{d.status}</span>
      : <span className="font-semibold text-foreground">{d.count}</span>
    </div>
  );
}

export function OrderStatusDonut({ data }: { data: StatusDatum[] }) {
  const chartData = data.filter((d) => d.count > 0);
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders by status</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            No orders yet.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative h-56 w-56 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={64}
                    outerRadius={88}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {chartData.map((d) => (
                      <Cell key={d.status} fill={colorFor(d.status)} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center total overlay */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tabular-nums text-foreground">
                  {total}
                </span>
                <span className="text-xs text-muted-foreground">orders</span>
              </div>
            </div>

            {/* Legend with counts */}
            <ul className="flex-1 space-y-2 text-sm">
              {data.map((d) => (
                <li
                  key={d.status}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: colorFor(d.status) }}
                    />
                    <span className="capitalize text-muted-foreground">
                      {d.status}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {d.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
