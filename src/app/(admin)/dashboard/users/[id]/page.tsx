import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Mail,
  Phone,
  BadgeCheck,
  ShoppingBag,
  IndianRupee,
  Star,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import prisma from "@/server/db";
import { UserRoleManager } from "@/components/admin/UserRoleManager";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";

const ROLE_LABEL: Record<string, string> = {
  customer: "Customer",
  shop_manager: "Shop Manager",
  support: "Support",
  admin: "Admin",
};

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  shop_manager: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  support: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  customer: "bg-muted text-muted-foreground",
};

const AUDIT_STATUS_STYLE: Record<string, string> = {
  success: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  blocked: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

const loadUser = cache(async (id: string) =>
  prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      role: true,
      isActive: true,
      banReason: true,
      phone: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
  })
);

const inr = (v: unknown) =>
  `₹${Number(v).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtDateTime = (d: Date | string) =>
  new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await loadUser(id);
  return { title: user ? `User · ${user.name}` : "User not found" };
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await loadUser(id);
  if (!user) notFound();

  const [orderCount, spent, reviewCount, auditLogs, recentOrders] =
    await Promise.all([
      prisma.order.count({ where: { userId: id } }),
      prisma.order.aggregate({
        _sum: { total: true },
        // "Spent" mirrors the revenue rule: exclude cancelled/returned orders and
        // failed payments (money never collected or refunded back).
        where: {
          userId: id,
          status: { notIn: ["cancelled", "returned"] },
          paymentStatus: { not: "failed" },
        },
      }),
      prisma.review.count({ where: { userId: id } }),
      prisma.auditLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      }),
    ]);

  const totalSpent = spent._sum.total ?? 0;

  const stats = [
    { label: "Total orders", value: orderCount.toLocaleString("en-IN"), icon: ShoppingBag },
    { label: "Total spent", value: inr(totalSpent), icon: IndianRupee },
    { label: "Reviews written", value: reviewCount.toLocaleString("en-IN"), icon: Star },
    { label: "Member since", value: fmtDate(user.createdAt), icon: CalendarDays },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              {user.name}
            </h1>
            <Badge
              className={cn(
                "border-transparent",
                ROLE_BADGE[user.role] ?? "bg-muted text-muted-foreground"
              )}
            >
              {ROLE_LABEL[user.role] ?? user.role}
            </Badge>
            {user.isActive ? (
              <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-400">
                Active
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-400">
                Banned
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left: profile + stats + audit */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-xl border border-border p-4"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
                    {s.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Recent orders */}
          <div className="rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium text-foreground">
                Recent orders
              </h2>
              {orderCount > recentOrders.length && (
                <span className="text-xs text-muted-foreground">
                  showing {recentOrders.length} of {orderCount}
                </span>
              )}
            </div>
            {recentOrders.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No orders placed yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/orders/${o.id}`}
                          className="hover:underline"
                        >
                          {o.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground">
                        {o._count.items}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {inr(o.total)}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={o.status} />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {fmtDate(o.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Audit log */}
          <div className="rounded-xl border border-border">
            <h2 className="border-b border-border px-4 py-3 text-sm font-medium text-foreground">
              Recent activity
            </h2>
            {auditLogs.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No recorded activity.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium capitalize">
                        {log.action.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                            AUDIT_STATUS_STYLE[log.status] ??
                              "bg-muted text-muted-foreground"
                          )}
                        >
                          {log.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {log.ipAddress ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {fmtDateTime(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Right: role + status management + profile */}
        <aside className="flex flex-col gap-6 lg:col-span-1 lg:sticky lg:top-6 lg:self-start">
          <UserRoleManager
            userId={user.id}
            currentRole={user.role}
            isActive={user.isActive}
          />

          {/* Profile */}
          <div className="rounded-xl border border-border p-5">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Profile
            </h2>
            <dl className="mt-3 flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <dd className="truncate text-foreground">{user.email}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                <dd className="text-foreground">{user.phone ?? "—"}</dd>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="size-4 shrink-0 text-muted-foreground" />
                <dd className="text-foreground">
                  Email {user.emailVerified ? "verified" : "unverified"}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="size-4 shrink-0 text-muted-foreground" />
                <dd className="text-foreground">
                  2FA {user.twoFactorEnabled ? "enabled" : "disabled"}
                </dd>
              </div>
            </dl>
            {!user.isActive && user.banReason && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                <span className="font-medium">Ban reason:</span> {user.banReason}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
