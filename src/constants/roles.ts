// The four application roles. Mirrors the `role` field on the Prisma User model
// and better-auth's role handling.
export const ROLES = {
  CUSTOMER: "customer",
  SHOP_MANAGER: "shop_manager",
  ADMIN: "admin",
  SUPPORT: "support",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
