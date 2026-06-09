"use client";
import { useSession, signOut } from "@/lib/auth-client";
import { ROLES, type Role } from "@/constants/roles";

export function useAuth() {
  const { data: session, isPending } = useSession();

  const logout = async () => {
    try {
      await signOut();
    } finally {
      // Hard navigation (not router.push) guarantees the better-auth client
      // session cache and all client state are dropped — a soft refresh can
      // leave the cookieCache-backed session looking valid until it expires.
      window.location.href = "/login";
    }
  };

  return {
    user: session?.user ?? null,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    role: (session?.user?.role as Role) ?? null,
    isAdmin: session?.user?.role === ROLES.ADMIN,
    isShopManager: session?.user?.role === ROLES.SHOP_MANAGER,
    isCustomer: session?.user?.role === ROLES.CUSTOMER,
    isSupport: session?.user?.role === ROLES.SUPPORT,
    logout,
  };
}
