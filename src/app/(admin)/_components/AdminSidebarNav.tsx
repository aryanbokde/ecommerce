"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  AlertCircle,
  Users,
  ShoppingBag,
  Tags,
  TicketPercent,
  Star,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface AdminSidebarNavProps {
  unresolvedErrors: number;
}

export default function AdminSidebarNav({
  unresolvedErrors,
}: AdminSidebarNavProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Users", href: "/dashboard/users", icon: Users },
    { label: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
    { label: "Products", href: "/dashboard/products", icon: Tags },
    { label: "Coupons", href: "/dashboard/coupons", icon: TicketPercent },
    { label: "Reviews", href: "/dashboard/reviews", icon: Star },
    { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    {
      label: "Error Logs",
      href: "/dashboard/error-logs",
      icon: AlertCircle,
      badge: unresolvedErrors,
    },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <Badge
                variant="destructive"
                className="h-4 min-w-4 px-1 text-[10px] tabular-nums"
              >
                {item.badge > 99 ? "99+" : item.badge}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
