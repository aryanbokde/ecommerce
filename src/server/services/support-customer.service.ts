import "server-only";

import { Prisma } from "@/generated/prisma";
import prisma from "@/server/db";
import { ROLES } from "@/constants/roles";

// ── Support customer lookup (READ-ONLY) ───────────────────────────────────────
// Shared by /api/support/customers[/id] and the support customer pages. Scoped
// to role=customer (support helps shoppers, not staff) and to SAFE fields only —
// never passwords (Account) or 2FA secrets (TwoFactor), which aren't selected.

// Profile fields safe to expose to support.
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  image: true,
  emailVerified: true,
  isActive: true,
  createdAt: true,
} as const;

export interface CustomerListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
}

export async function searchCustomers(opts: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { search, page = 1, limit = 20 } = opts;

  const where: Prisma.UserWhereInput = {
    role: ROLES.CUSTOMER,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { ...SAFE_USER_SELECT, _count: { select: { orders: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  const customers: CustomerListItem[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    image: u.image,
    emailVerified: u.emailVerified,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    orderCount: u._count.orders,
  }));

  return { customers, total, page, totalPages: Math.ceil(total / limit) };
}

export interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  addresses: {
    id: string;
    label: string;
    fullName: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
  }[];
  orderCount: number;
  totalSpent: number;
  reviewCount: number;
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    itemCount: number;
    createdAt: string;
  }[];
}

/** Full read-only profile for one customer, or `null` if not a customer. */
export async function getCustomerDetail(
  id: string
): Promise<CustomerDetail | null> {
  const user = await prisma.user.findFirst({
    where: { id, role: ROLES.CUSTOMER },
    select: {
      ...SAFE_USER_SELECT,
      addresses: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          label: true,
          fullName: true,
          phone: true,
          line1: true,
          line2: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          isDefault: true,
        },
      },
    },
  });
  if (!user) return null;

  const [orderCount, spent, reviewCount, recent] = await Promise.all([
    prisma.order.count({ where: { userId: id } }),
    prisma.order.aggregate({
      _sum: { total: true },
      // "Spent" mirrors the revenue rule: exclude cancelled/returned orders and
      // failed payments.
      where: {
        userId: id,
        status: { notIn: ["cancelled", "returned"] },
        paymentStatus: { not: "failed" },
      },
    }),
    prisma.review.count({ where: { userId: id } }),
    prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    image: user.image,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    addresses: user.addresses,
    orderCount,
    totalSpent: Number(spent._sum.total ?? 0),
    reviewCount,
    recentOrders: recent.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.total),
      itemCount: o._count.items,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}
