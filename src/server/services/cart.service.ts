import "server-only";

import { Prisma } from "@/generated/prisma";
import prisma from "@/server/db";
import { AppError, ErrorCode } from "@/lib/api-error";

// ── Cart service ──────────────────────────────────────────────────────────────
// One cart per user (Cart.userId is unique). Every item-level operation is
// scoped by userId so a user can only ever touch their own cart items.

// Product fields surfaced alongside each cart item.
const cartItemProduct = {
  select: {
    id: true,
    name: true,
    slug: true,
    price: true,
    images: true,
    stock: true,
    isActive: true,
  },
} as const;

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: { product: cartItemProduct },
  },
} satisfies Prisma.CartInclude;

function assertStock(available: number, requested: number) {
  if (requested > available) {
    throw new AppError(
      `Insufficient stock — only ${available} available`,
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }
}

/** Resolve the user's cart id, creating the cart if it doesn't exist yet. */
async function getOrCreateCartId(userId: string): Promise<string> {
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });
  return cart.id;
}

/** Load a cart item and confirm it belongs to `userId`; 404 otherwise. */
async function getOwnedCartItem(userId: string, cartItemId: string) {
  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: {
      cart: { select: { userId: true } },
      product: { select: { stock: true, isActive: true } },
    },
  });
  if (!item || item.cart.userId !== userId) {
    throw new AppError("Cart item not found", ErrorCode.NOT_FOUND, 404);
  }
  return item;
}

/** Get (or lazily create) the user's cart with items + product details. */
export async function getCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: cartInclude,
  });
}

export async function addToCart(
  userId: string,
  productId: string,
  quantity: number
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true, stock: true },
  });
  if (!product) {
    throw new AppError("Product not found", ErrorCode.NOT_FOUND, 404);
  }
  if (!product.isActive) {
    throw new AppError(
      "Product is not available",
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }

  const cartId = await getOrCreateCartId(userId);

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId, productId } },
  });

  if (existing) {
    // Validate the resulting total against stock, not just the delta.
    const newQuantity = existing.quantity + quantity;
    assertStock(product.stock, newQuantity);
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQuantity },
    });
  } else {
    assertStock(product.stock, quantity);
    await prisma.cartItem.create({
      data: { cartId, productId, quantity },
    });
  }

  return getCart(userId);
}

export async function updateCartItem(
  userId: string,
  cartItemId: string,
  quantity: number
) {
  const item = await getOwnedCartItem(userId, cartItemId);

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return getCart(userId);
  }

  assertStock(item.product.stock, quantity);
  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity },
  });

  return getCart(userId);
}

export async function removeFromCart(userId: string, cartItemId: string) {
  const item = await getOwnedCartItem(userId, cartItemId);
  await prisma.cartItem.delete({ where: { id: item.id } });
  return getCart(userId);
}

export async function clearCart(userId: string) {
  const cartId = await getOrCreateCartId(userId);
  await prisma.cartItem.deleteMany({ where: { cartId } });
  return getCart(userId);
}

/** Subtotal computed from CURRENT product prices (Decimal-safe). */
export async function getCartTotal(userId: string) {
  const items = await prisma.cartItem.findMany({
    where: { cart: { userId } },
    include: { product: { select: { price: true } } },
  });

  let subtotal = new Prisma.Decimal(0);
  let totalQuantity = 0;
  for (const item of items) {
    subtotal = subtotal.add(item.product.price.mul(item.quantity));
    totalQuantity += item.quantity;
  }

  return {
    subtotal: subtotal.toFixed(2),
    totalQuantity,
    distinctItems: items.length,
  };
}

/** Total item count (sum of quantities) for the nav cart badge. */
export async function syncCartCount(userId: string) {
  const result = await prisma.cartItem.aggregate({
    where: { cart: { userId } },
    _sum: { quantity: true },
  });
  return { count: result._sum.quantity ?? 0 };
}
