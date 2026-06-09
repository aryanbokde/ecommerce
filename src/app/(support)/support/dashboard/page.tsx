import type { Metadata } from "next";
import { ShoppingBag, Clock, Truck } from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { StatCard } from "@/components/admin/StatCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SupportSearch } from "@/components/support/SupportSearch";
import { RecentOrdersTable } from "@/components/support/RecentOrdersTable";
import { getSupportStats } from "@/server/services/support-stats.service";

export const metadata: Metadata = { title: "Support" };

export default async function SupportDashboardPage() {
  // Read the service directly (no server-to-self fetch).
  const { ordersToday, awaitingFulfillment, shippedToday, recentOrders } =
    await getSupportStats();

  return (
    <DashboardShell
      title="Support"
      description="Look up orders and customers to help shoppers fast"
    >
      <div className="space-y-6">
        {/* Prominent global search */}
        <Card>
          <CardContent className="py-5">
            <SupportSearch size="lg" />
            <p className="mt-2 text-xs text-muted-foreground">
              Find an order by number, or a customer by email or name.
            </p>
          </CardContent>
        </Card>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Orders Today"
            value={ordersToday.toLocaleString("en-IN")}
            icon={ShoppingBag}
            accent="blue"
            trendLabel="placed since midnight"
          />
          <StatCard
            title="Awaiting Fulfillment"
            value={awaitingFulfillment.toLocaleString("en-IN")}
            icon={Clock}
            accent="amber"
            trendLabel="pending · confirmed · processing"
          />
          <StatCard
            title="Shipped Today"
            value={shippedToday.toLocaleString("en-IN")}
            icon={Truck}
            accent="emerald"
            trendLabel="dispatched since midnight"
          />
        </div>

        {/* Recent orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentOrdersTable orders={recentOrders} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
