import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  BadgeCheck,
  ShoppingBag,
  IndianRupee,
  CalendarDays,
  MapPin,
  Lock,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { CopyButton } from "@/components/support/CopyButton";
import { getCustomerDetail } from "@/server/services/support-customer.service";

const inr = (v: number) =>
  `₹${v.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
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
  const customer = await getCustomerDetail(id);
  return {
    title: customer ? `Customer · ${customer.name}` : "Customer not found",
  };
}

export default async function SupportCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerDetail(id);
  if (!customer) notFound();

  const stats = [
    {
      label: "Total orders",
      value: customer.orderCount.toLocaleString("en-IN"),
      icon: ShoppingBag,
    },
    { label: "Total spent", value: inr(customer.totalSpent), icon: IndianRupee },
    {
      label: "Member since",
      value: fmtDate(customer.createdAt),
      icon: CalendarDays,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/support/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Customer Lookup
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Avatar size="lg">
          {customer.image ? (
            <AvatarImage src={customer.image} alt={customer.name} />
          ) : null}
          <AvatarFallback>{initials(customer.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              {customer.name}
            </h1>
            {customer.isActive ? (
              <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-400">
                Active
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-400">
                Banned
              </span>
            )}
            {/* Support is strictly read-only. */}
            <Badge className="gap-1 border-transparent bg-muted text-muted-foreground">
              <Lock className="size-3" />
              Read-only
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{customer.email}</p>
        </div>
        <CopyButton value={customer.email} label="Copy email" />
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-border p-4">
              <Icon className="size-4 text-muted-foreground" />
              <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Profile (read-only — no edit buttons) */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Profile</CardTitle>
            <Badge className="gap-1 border-transparent bg-muted text-muted-foreground">
              <Lock className="size-3" />
              Read-only
            </Badge>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <dd className="min-w-0 truncate text-foreground">
                  {customer.email}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                <dd className="text-foreground">{customer.phone ?? "—"}</dd>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="size-4 shrink-0 text-muted-foreground" />
                <dd className="text-foreground">
                  Email {customer.emailVerified ? "verified" : "unverified"}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                <dd className="text-foreground">
                  Joined {fmtDate(customer.createdAt)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Addresses (read-only) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.addresses.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No saved addresses.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {customer.addresses.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {a.label}
                      </span>
                      {a.isDefault && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-foreground">{a.fullName}</p>
                    <p className="text-muted-foreground">
                      {[a.line1, a.line2, a.city, a.state, a.postalCode, a.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p className="text-muted-foreground">{a.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders → order detail */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {customer.recentOrders.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">
              No orders yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-0 text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link
                        href={`/support/orders/${o.id}`}
                        className="font-medium tabular-nums hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {o.itemCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {inr(o.total)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmtDate(o.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`View ${o.orderNumber}`}
                        render={<Link href={`/support/orders/${o.id}`} />}
                        nativeButton={false}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
