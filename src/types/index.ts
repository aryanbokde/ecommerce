// Shared client-facing domain types. These mirror the Prisma models but reflect
// what the API actually returns over the wire — notably Decimal fields arrive as
// strings after JSON serialization, so money is typed `string | number`.

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: string | number;
  comparePrice?: string | number | null;
  costPrice?: string | number | null;
  sku?: string | null;
  barcode?: string | null;
  stock: number;
  lowStockAt?: number;
  weight?: string | number | null;
  categoryId?: string | null;
  images?: string[] | null;
  tags?: string[] | null;
  isActive: boolean;
  isFeatured: boolean;
  category?: CategoryRef | null;
  // Computed aggregates (populated by endpoints that include review stats).
  avgRating?: number | null;
  reviewCount?: number | null;
  soldCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount?: number;
  children?: Category[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  product: Product;
  createdAt?: string;
  updatedAt?: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  price: string | number;
  quantity: number;
  total: string | number;
  image?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  addressId?: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  subtotal: string | number;
  tax: string | number;
  shipping: string | number;
  discount: string | number;
  total: string | number;
  notes?: string | null;
  items: OrderItem[];
  address?: Address | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
