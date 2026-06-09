"use client";

import { Suspense, useState } from "react";
import { useCart } from "@/hooks/useCart";
import Link from "next/link";
import {
  Menu,
  Search,
  ShoppingCart,
  Package,
  User as UserIcon,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CategoryNav } from "@/components/layout/CategoryNav";

function initials(name?: string | null): string {
  if (!name) return "U";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Logo({
  storeName,
  storeLogo,
}: {
  storeName: string;
  storeLogo?: string;
}) {
  return (
    <Link
      href="/"
      className="font-heading text-lg font-semibold tracking-tight text-foreground"
    >
      {storeLogo ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-set external logo of unknown dimensions
        <img src={storeLogo} alt={storeName} className="h-7 w-auto" />
      ) : (
        storeName
      )}
    </Link>
  );
}

function CartButton({ count }: { count: number }) {
  return (
    <Button
      render={<Link href="/cart" />}
      nativeButton={false}
      variant="ghost"
      size="icon"
      aria-label={`Cart${count > 0 ? `, ${count} items` : ""}`}
      className="relative"
    >
      <ShoppingCart />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}

function UserMenu() {
  const { user, isCustomer, isAdmin, logout } = useAuth();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
        <Avatar size="sm">
          {user?.image ? <AvatarImage src={user.image} alt={user.name ?? ""} /> : null}
          <AvatarFallback>{initials(user?.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel className="truncate">
          {user?.name ?? "Account"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Customer-only account pages (these routes are customer-gated). */}
        {isCustomer && (
          <>
            <DropdownMenuItem render={<Link href="/orders" />}>
              <Package />
              My Orders
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/profile" />}>
              <UserIcon />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Admins get a link to their panel instead (avoids the customer 403). */}
        {isAdmin && (
          <>
            <DropdownMenuItem render={<Link href="/dashboard/error-logs" />}>
              <LayoutDashboard />
              Admin Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem variant="destructive" onClick={() => logout()}>
          <LogOut />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AuthButtons() {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        render={<Link href="/login" />}
        nativeButton={false}
        variant="ghost"
        size="sm"
      >
        Login
      </Button>
      <Button
        render={<Link href="/register" />}
        nativeButton={false}
        size="sm"
      >
        Sign up
      </Button>
    </div>
  );
}

export interface StorefrontHeaderProps {
  storeName?: string;
  storeLogo?: string;
}

export function StorefrontHeader({
  storeName = "MyShop",
  storeLogo,
}: StorefrontHeaderProps = {}) {
  const isScrolled = useScrolled();
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cart count comes from the shared store, which holds either the DB cart
  // (logged in) or the localStorage guest cart (logged out) — so the badge is
  // correct for everyone. The CartDrawer (mounted in the store layout) keeps it
  // populated and every add/update refreshes it.
  const displayCount = useCart((s) => s.count);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border bg-background/95 transition-shadow",
        isScrolled &&
          "shadow-sm supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: mobile menu + logo */}
        <div className="flex items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open menu"
                />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>Browse</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
                <Suspense
                  fallback={<Skeleton className="h-40 w-full rounded-md" />}
                >
                  <CategoryNav
                    orientation="vertical"
                    onNavigate={() => setMobileOpen(false)}
                  />
                </Suspense>
                {!isAuthenticated && !isLoading && (
                  <div className="flex flex-col gap-2 border-t border-border pt-4">
                    <Button
                      render={<Link href="/login" />}
                      nativeButton={false}
                      variant="outline"
                      onClick={() => setMobileOpen(false)}
                    >
                      Login
                    </Button>
                    <Button
                      render={<Link href="/register" />}
                      nativeButton={false}
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign up
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Logo storeName={storeName} storeLogo={storeLogo} />
        </div>

        {/* Center: category nav (desktop only). Semantic <nav> landmark — the
            Base UI NavigationMenu inside renders a <div>, so wrap it here. */}
        <nav
          aria-label="Primary"
          className="hidden flex-1 justify-center lg:flex"
        >
          <Suspense fallback={<Skeleton className="h-8 w-80" />}>
            <CategoryNav />
          </Suspense>
        </nav>

        {/* Right: search, cart, auth */}
        <div className="flex items-center gap-1">
          <Button
            render={<Link href="/shop" />}
            nativeButton={false}
            variant="ghost"
            size="icon"
            aria-label="Search products"
          >
            <Search />
          </Button>

          <CartButton count={displayCount} />

          {isLoading ? (
            <Skeleton className="size-7 rounded-full" />
          ) : isAuthenticated ? (
            <UserMenu />
          ) : (
            <div className="hidden sm:block">
              <AuthButtons />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
