"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  Search,
  ShoppingCart,
  Package,
  User as UserIcon,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { SearchBar } from "@/components/shared/SearchBar";

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

// Refined wordmark — bolder, tighter tracking, with a brand-teal dot accent.
// The admin-set logo image (unknown dimensions) is rendered as-is when present.
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
      aria-label={storeName}
      className="group flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {storeLogo ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-set external logo of unknown dimensions
        <img src={storeLogo} alt={storeName} className="h-7 w-auto" />
      ) : (
        <span className="font-heading text-xl font-bold tracking-tighter text-foreground transition-colors">
          {storeName}
          <span className="text-primary transition-colors group-hover:text-primary/80">
            .
          </span>
        </span>
      )}
    </Link>
  );
}

// Cart icon + count badge. The badge keyframes a small spring "pop" whenever the
// count changes (key={count} forces a fresh mount → enter animation).
function CartButton({ count }: { count: number }) {
  return (
    <Button
      render={<Link href="/cart" />}
      nativeButton={false}
      variant="ghost"
      size="icon"
      aria-label={`Cart${count > 0 ? `, ${count} items` : ""}`}
      className="relative rounded-lg transition-colors hover:bg-muted"
    >
      <ShoppingCart />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background"
          >
            {count > 99 ? "99+" : count}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}

function UserMenu() {
  const { user, isCustomer, isAdmin, logout } = useAuth();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring/50">
        <Avatar
          size="sm"
          className="ring-2 ring-border ring-offset-1 ring-offset-background transition-all hover:ring-primary/40"
        >
          {user?.image ? (
            <AvatarImage src={user.image} alt={user.name ?? ""} />
          ) : null}
          <AvatarFallback>{initials(user?.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">
            {user?.name ?? "Account"}
          </span>
          {user?.email && (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          )}
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
      <Button render={<Link href="/register" />} nativeButton={false} size="sm">
        Sign up
      </Button>
    </div>
  );
}

// Simple search field for the mobile sheet — submits to the products search page
// (same destination as the desktop SearchBar's "see all results"). No new API.
function MobileSearch({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    router.push(
      trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : "/products"
    );
    onNavigate?.();
  }

  return (
    <form onSubmit={submit} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products…"
        aria-label="Search products"
        className="pl-9"
      />
    </form>
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
        "sticky top-0 z-40 w-full transition-all duration-300",
        isScrolled
          ? "border-b border-border bg-background/80 shadow-sm supports-[backdrop-filter]:bg-background/65 supports-[backdrop-filter]:backdrop-blur-xl"
          : "border-b border-transparent bg-background/60 supports-[backdrop-filter]:bg-background/40 supports-[backdrop-filter]:backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[4.5rem] lg:px-8">
        {/* Left: mobile menu + logo */}
        <div className="flex items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg lg:hidden"
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
              <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-4">
                <MobileSearch onNavigate={() => setMobileOpen(false)} />
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
          {/* Inline expanding search with autocomplete (desktop + tablet). */}
          <div className="hidden sm:block">
            <SearchBar />
          </div>
          {/* Mobile: a plain link to the search page (the field lives in the sheet). */}
          <Button
            render={<Link href="/products" />}
            nativeButton={false}
            variant="ghost"
            size="icon"
            aria-label="Search products"
            className="rounded-lg transition-colors hover:bg-muted sm:hidden"
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
