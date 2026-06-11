"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, Bell, Store, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackendThemeToggle } from "@/components/backend-theme";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useSidebar } from "@/hooks/useSidebar";
import { useAuth } from "@/hooks/useAuth";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  shop_manager: "Shop Manager",
  support: "Support",
  customer: "Customer",
};

interface AdminTopbarProps {
  user: { name: string; email?: string | null; role: string; image?: string | null };
}

function initials(name?: string | null): string {
  if (!name) return "A";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// cuid/uuid-style id segments (e.g. /users/cmq73wx0f0003…) shouldn't show as a
// raw token in the breadcrumb — label them "Details" instead.
function looksLikeId(segment: string): boolean {
  return segment.length >= 20 && /^[a-z0-9]+$/i.test(segment);
}

function titleize(segment: string): string {
  if (looksLikeId(segment)) return "Details";
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AdminTopbar({ user }: AdminTopbarProps) {
  const openMobile = useSidebar((s) => s.openMobile);
  const { logout } = useAuth();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-4">
      {/* Left: mobile menu + breadcrumb */}
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={openMobile}
          aria-label="Open menu"
        >
          <Menu />
        </Button>
        <Breadcrumb className="hidden min-w-0 sm:block">
          <BreadcrumbList>
            {segments.map((seg, i) => {
              const href = "/" + segments.slice(0, i + 1).join("/");
              const last = i === segments.length - 1;
              return (
                <Fragment key={href}>
                  {i > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {last ? (
                      <BreadcrumbPage>{titleize(seg)}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link href={href} />}>
                        {titleize(seg)}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right: search, notifications, theme, user */}
      <div className="flex items-center gap-1">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search…"
            aria-label="Search admin"
            className="h-8 w-48 pl-8"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          render={<Link href="/dashboard/error-logs" />}
          nativeButton={false}
        >
          <Bell />
        </Button>

        <BackendThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <Avatar size="sm">
              {user.image ? (
                <AvatarImage src={user.image} alt={user.name} />
              ) : null}
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="truncate text-sm font-medium text-foreground">
                  {user.name}
                </span>
                {user.email && (
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                )}
                <span className="mt-1 w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/" />}>
              <Store />
              View store
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => logout()}>
              <LogOut />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
