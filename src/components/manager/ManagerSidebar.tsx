"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Package,
  ClipboardList,
  AlertTriangle,
  PanelLeft,
  PanelLeftClose,
  Store,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";

/**
 * Broadcast on `window` after a manager action changes a worklist count
 * (an order shipped, stock restocked) so the sidebar badge refetches.
 * The badge count reflects REAL work state — it never changes on mere click.
 */
export const MANAGER_BADGES_REFRESH = "manager:badges-refresh";

type BadgeKey = "lowStock" | "orders";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: BadgeKey;
  // Badge click navigates here (just a shortcut to the list — does NOT alter
  // the count). Falls back to `href`.
  badgeHref?: string;
}

// Manager-scoped navigation only — NO Users/Roles, Error Logs, Categories, or
// destructive actions. URLs live under /shop-manager/* (the (shop-manager)
// group keeps the prefix so it never collides with admin's /dashboard).
const NAV: NavItem[] = [
  { label: "Overview", href: "/shop-manager/dashboard", icon: LayoutDashboard },
  {
    label: "Inventory",
    href: "/shop-manager/inventory",
    icon: Boxes,
    badge: "lowStock",
    badgeHref: "/shop-manager/low-stock",
  },
  { label: "Products", href: "/shop-manager/products", icon: Package },
  {
    label: "Orders to Fulfill",
    href: "/shop-manager/orders",
    icon: ClipboardList,
    badge: "orders",
    badgeHref: "/shop-manager/orders",
  },
  {
    label: "Low Stock",
    href: "/shop-manager/low-stock",
    icon: AlertTriangle,
    badge: "lowStock",
    badgeHref: "/shop-manager/low-stock",
  },
];

type Badges = Record<BadgeKey, number>;

function useBadges(): Badges {
  const [badges, setBadges] = useState<Badges>({ lowStock: 0, orders: 0 });
  const pathname = usePathname();
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/manager/stats", {
          credentials: "include",
          cache: "no-store",
        });
        const j = res.ok ? await res.json() : null;
        if (!cancelled && j?.data) {
          setBadges({
            lowStock: j.data.lowStockCount ?? 0,
            orders: j.data.ordersToFulfill ?? 0,
          });
        }
      } catch {
        /* badges are best-effort */
      }
    }
    void run();

    // Counts reflect real work state, so refetch when it can have changed:
    // tab refocus, route change (pathname dep), or an explicit broadcast after
    // a manager action (order shipped / stock restocked). Never on badge click.
    const onFocus = () => void run();
    const onRefresh = () => void run();
    window.addEventListener("focus", onFocus);
    window.addEventListener(MANAGER_BADGES_REFRESH, onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(MANAGER_BADGES_REFRESH, onRefresh);
    };
  }, [pathname]);
  return badges;
}

function isActive(pathname: string, href: string): boolean {
  return href === "/shop-manager/dashboard"
    ? pathname === href
    : pathname.startsWith(href);
}

function NavList({
  collapsed,
  badges,
  onNavigate,
}: {
  collapsed: boolean;
  badges: Badges;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav className="flex flex-col gap-1 p-2">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const count = item.badge ? badges[item.badge] : 0;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {count > 0 &&
              (collapsed ? (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
              ) : item.badgeHref ? (
                // Clickable shortcut to the worklist — navigation only, the
                // count is unchanged (it tracks real work, not "seen").
                <span
                  role="button"
                  tabIndex={0}
                  title={`Open ${item.label.toLowerCase()}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNavigate?.();
                    router.push(item.badgeHref!);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onNavigate?.();
                      router.push(item.badgeHref!);
                    }
                  }}
                  className="ml-auto inline-flex h-5 min-w-5 cursor-pointer items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/85"
                >
                  {count > 99 ? "99+" : count}
                </span>
              ) : (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {count > 99 ? "99+" : count}
                </span>
              ))}
          </Link>
        );
      })}
    </nav>
  );
}

export function ManagerSidebar() {
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile } = useSidebar();
  const badges = useBadges();

  return (
    <>
      {/* Desktop — fixed-width, collapsible to icons */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b px-3",
            isCollapsed ? "justify-center" : "justify-between"
          )}
        >
          {!isCollapsed && (
            <Link
              href="/shop-manager/dashboard"
              className="flex items-center gap-2 font-semibold tracking-tight text-foreground"
            >
              <Store className="size-5 text-primary" />
              <span>Operations</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeft /> : <PanelLeftClose />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <NavList collapsed={isCollapsed} badges={badges} />
        </div>

        {!isCollapsed && (
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            Shop Manager
          </div>
        )}
      </aside>

      {/* Mobile — Sheet drawer */}
      <Sheet open={isMobileOpen} onOpenChange={(open) => !open && closeMobile()}>
        <SheetContent side="left" className="w-60 gap-0 bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="h-14 justify-center border-b px-4">
            <SheetTitle className="flex items-center gap-2">
              <Store className="size-5 text-primary" />
              Operations
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto">
            <NavList collapsed={false} badges={badges} onNavigate={closeMobile} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
