"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Star,
  AlertTriangle,
  Activity,
  ScrollText,
  Settings,
  Mail,
  PanelLeft,
  PanelLeftClose,
  ShoppingBag,
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
 * Broadcast on `window` after an admin mutation changes a sidebar count
 * (orders / reviews / errors) so the badge refetches immediately.
 * Usage: `window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH))`.
 */
export const ADMIN_BADGES_REFRESH = "admin:badges-refresh";

type BadgeKey = "orders" | "reviews" | "errors";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: BadgeKey;
  // Where the badge jumps to — a pre-filtered view of exactly the counted
  // items (pending orders / unresolved errors). Falls back to `href`.
  badgeHref?: string;
}

// NOTE: the (admin) route group serves URLs under /dashboard (not /admin), so
// these hrefs match the actual routes. Most pages are built incrementally.
const NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/dashboard/products", icon: Package },
  { label: "Categories", href: "/dashboard/categories", icon: FolderTree },
  {
    label: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    badge: "orders",
    badgeHref: "/dashboard/orders",
  },
  { label: "Users", href: "/dashboard/users", icon: Users },
  {
    label: "Reviews",
    href: "/dashboard/reviews",
    icon: Star,
    badge: "reviews",
    badgeHref: "/dashboard/reviews?new=7d",
  },
  // Settings submenu.
  { label: "Store Settings", href: "/dashboard/settings/shop", icon: Settings },
  { label: "Email Templates", href: "/dashboard/settings/email", icon: Mail },
  // Monitoring / system — kept at the end of the menu.
  { label: "Audit Logs", href: "/dashboard/audit-logs", icon: ScrollText },
  {
    label: "Error Logs",
    href: "/dashboard/error-logs",
    icon: AlertTriangle,
    badge: "errors",
    badgeHref: "/dashboard/error-logs",
  },
  { label: "Site Health", href: "/dashboard/health", icon: Activity },
];

type Badges = Record<BadgeKey, number>;

function useBadges(): Badges {
  const [badges, setBadges] = useState<Badges>({
    orders: 0,
    reviews: 0,
    errors: 0,
  });
  const pathname = usePathname();
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/admin/stats", {
          credentials: "include",
          cache: "no-store",
        });
        const json = res.ok ? await res.json() : null;
        if (!cancelled && json?.data) {
          setBadges({
            orders: json.data.orders?.unseen ?? 0,
            reviews: json.data.reviews?.unseen ?? 0,
            errors: json.data.errors?.unseen ?? 0,
          });
        }
      } catch {
        /* badges are best-effort */
      }
    }
    void run();

    // Keep the counts fresh. Refetch on: tab refocus, a broadcast
    // ADMIN_BADGES_REFRESH (same-page mutation, e.g. error-logs bulk delete),
    // and route change (the effect re-runs because `pathname` is a dep) —
    // otherwise the badge stays stale until a full reload.
    const onFocus = () => void run();
    const onRefresh = () => void run();
    window.addEventListener("focus", onFocus);
    window.addEventListener(ADMIN_BADGES_REFRESH, onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(ADMIN_BADGES_REFRESH, onRefresh);
    };
  }, [pathname]);
  return badges;
}

function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
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
                // Clickable badge → jumps straight to the filtered view of the
                // exact items it counts (pending orders / unresolved errors).
                // role=button + onClick (not a nested <a>, which is invalid).
                <span
                  role="button"
                  tabIndex={0}
                  title={`Show ${count} ${item.label.toLowerCase()} needing attention`}
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

export function AdminSidebar() {
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile } = useSidebar();
  const badges = useBadges();

  return (
    <>
      {/* Desktop — fixed-width, collapsible to icons */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
          isCollapsed ? "w-16" : "w-64"
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
              href="/dashboard"
              className="flex items-center gap-2 font-semibold tracking-tight text-foreground"
            >
              <ShoppingBag className="size-5 text-primary" />
              <span>MyShop</span>
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
            MyShop Admin v0.1.0
          </div>
        )}
      </aside>

      {/* Mobile — Sheet drawer */}
      <Sheet open={isMobileOpen} onOpenChange={(open) => !open && closeMobile()}>
        <SheetContent side="left" className="w-64 gap-0 bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="h-14 justify-center border-b px-4">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingBag className="size-5 text-primary" />
              MyShop Admin
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
