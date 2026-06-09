"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Users,
  Package,
  PanelLeft,
  PanelLeftClose,
  LifeBuoy,
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

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

// Support is read-only triage: lookups only. Deliberately NO inventory,
// fulfilment, users/roles, deletes, or error logs. URLs live under /support/*
// (the (support) group keeps the prefix so it never collides with admin's
// /dashboard).
const NAV: NavItem[] = [
  { label: "Overview", href: "/support/dashboard", icon: LayoutDashboard },
  { label: "Order Lookup", href: "/support/orders", icon: Receipt },
  { label: "Customer Lookup", href: "/support/customers", icon: Users },
  { label: "Product Lookup", href: "/support/products", icon: Package },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/support/dashboard"
    ? pathname === href
    : pathname.startsWith(href);
}

function NavList({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-2">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
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
          </Link>
        );
      })}
    </nav>
  );
}

export function SupportSidebar() {
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile } =
    useSidebar();

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
              href="/support/dashboard"
              className="flex items-center gap-2 font-semibold tracking-tight text-foreground"
            >
              <LifeBuoy className="size-5 text-primary" />
              <span>Support</span>
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
          <NavList collapsed={isCollapsed} />
        </div>

        {!isCollapsed && (
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            Support
          </div>
        )}
      </aside>

      {/* Mobile — Sheet drawer */}
      <Sheet open={isMobileOpen} onOpenChange={(open) => !open && closeMobile()}>
        <SheetContent side="left" className="w-60 gap-0 bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="h-14 justify-center border-b px-4">
            <SheetTitle className="flex items-center gap-2">
              <LifeBuoy className="size-5 text-primary" />
              Support
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto">
            <NavList collapsed={false} onNavigate={closeMobile} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
