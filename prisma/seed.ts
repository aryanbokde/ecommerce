/**
 * Database seeder — single-vendor ecommerce app.
 *
 * Seeds every table in FK-safe dependency order in a single run, using
 * @faker-js/faker for realistic (and, via faker.seed(123), reproducible) data
 * and bcryptjs for password hashing.
 *
 * Run with:  npx prisma db seed     (configured as `tsx prisma/seed.ts`)
 *
 * NOTE: imports the custom client output (src/generated/prisma), NOT
 * "@prisma/client". Login password for every seeded account is "Password123!".
 */
import { PrismaClient, Prisma } from "../src/generated/prisma";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import { seedSettings } from "./seed-settings";

const prisma = new PrismaClient();

// Reproducible data across runs.
faker.seed(123);

const PASSWORD = "Password123!";

// ── helpers ───────────────────────────────────────────────────────────────────
const pick = <T>(arr: T[]): T => faker.helpers.arrayElement(arr);

function kebab(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Real, category-relevant product photos hosted on our own Cloudinary
// (res.cloudinary.com is whitelisted in next.config.ts). These are the assets
// migrated from the source stock photos — owning them keeps the catalog stable
// regardless of any external host.
const CL = "https://res.cloudinary.com/dbgwxnfpa/image/upload";

const IMG_POOL: Record<LeafType, string[]> = {
  smartphones: [
    `${CL}/v1781036067/myshop/products/r8p6eseltcppa6dokjwt.jpg`,
    `${CL}/v1781036068/myshop/products/kuiysvrurqmw4hmhlady.jpg`,
    `${CL}/v1781036069/myshop/products/o2bndz71l3lzpjhoy5pr.jpg`,
    `${CL}/v1781036071/myshop/products/modxl0gxwbppazqxkebq.jpg`,
    `${CL}/v1781036072/myshop/products/opejh4qoip8bdllef6ea.jpg`,
    `${CL}/v1781036073/myshop/products/jununuafq3lwyecluxgo.jpg`,
  ],
  laptops: [
    `${CL}/v1781036074/myshop/products/gsblqdlia4idmps34myf.jpg`,
    `${CL}/v1781036075/myshop/products/t29torkq3zhvkiad42xg.jpg`,
    `${CL}/v1781036076/myshop/products/u80udxafjsjqofywloxw.jpg`,
    `${CL}/v1781036078/myshop/products/d4ljjprfiflvsicat63y.jpg`,
    `${CL}/v1781036079/myshop/products/aujm7lbaqxbxxmpqhrx9.jpg`,
    `${CL}/v1781036080/myshop/products/wm7jx7oaefzbfxg9hsjy.jpg`,
  ],
  books: [
    `${CL}/v1781036104/myshop/products/jqw6keyy6robqwkdreqz.jpg`,
    `${CL}/v1781036105/myshop/products/qpyqylkcgxrzqgojtfut.jpg`,
    `${CL}/v1781036106/myshop/products/qehtkourm1dpibusvowc.jpg`,
    `${CL}/v1781036107/myshop/products/ih9bvk4sqbv9tjbxy6uy.jpg`,
    `${CL}/v1781036108/myshop/products/r5zw4gp5tatrceoerqkj.jpg`,
    `${CL}/v1781036109/myshop/products/s6i5oionbhslwbtmofo1.jpg`,
  ],
  "home-kitchen": [
    `${CL}/v1781036097/myshop/products/sybhluxvmghenzxjzf92.jpg`,
    `${CL}/v1781036098/myshop/products/pa7gejmkxnxis1yqrm8m.jpg`,
    `${CL}/v1781036099/myshop/products/huahqg9nm1ke8xrlrmwt.jpg`,
    `${CL}/v1781036100/myshop/products/moa4wxqpwsfahddnmzcx.jpg`,
    `${CL}/v1781036101/myshop/products/qj6oxbas9wlfz1yk6cyk.jpg`,
    `${CL}/v1781036102/myshop/products/njfuzlietajqsmhbjibf.jpg`,
  ],
  "mens-wear": [
    `${CL}/v1781036081/myshop/products/le485vifmejhyjf277t8.jpg`,
    `${CL}/v1781036082/myshop/products/et8tcqweduwgbb7j1vyg.jpg`,
    `${CL}/v1781036083/myshop/products/chdf8byti43hchvmwfrz.jpg`,
    `${CL}/v1781036085/myshop/products/peujqv2ehcojlbudvqqh.jpg`,
    `${CL}/v1781036087/myshop/products/bvdomrelvlrexuyeleij.jpg`,
    `${CL}/v1781036089/myshop/products/j0nafxxxi1yvwy1idwrj.jpg`,
  ],
  "womens-wear": [
    `${CL}/v1781036090/myshop/products/zoh3vxfdzvrixpm4kmnn.jpg`,
    `${CL}/v1781036091/myshop/products/mqu3nieqeuuhlmknbrs6.jpg`,
    `${CL}/v1781036092/myshop/products/ni225ntvrbdmrf8cqwqe.jpg`,
    `${CL}/v1781036093/myshop/products/mrbrmakhwf3t1s5sh4gm.jpg`,
    `${CL}/v1781036094/myshop/products/dpunucwriz36gxptabck.jpg`,
    `${CL}/v1781036095/myshop/products/xoaktn1h0t6up57hipg9.jpg`,
  ],
};

// Category banner by name (parents reuse a representative leaf photo).
const CAT_IMG: Record<string, string> = {
  Smartphones: IMG_POOL.smartphones[0],
  Laptops: IMG_POOL.laptops[0],
  "Men's Wear": IMG_POOL["mens-wear"][0],
  "Women's Wear": IMG_POOL["womens-wear"][0],
  "Home & Kitchen": IMG_POOL["home-kitchen"][0],
  Books: IMG_POOL.books[0],
  Electronics: IMG_POOL.laptops[1],
  Fashion: IMG_POOL["womens-wear"][1],
  Cookware: IMG_POOL["home-kitchen"][0],
  Tableware: IMG_POOL["home-kitchen"][1],
  Fiction: IMG_POOL.books[0],
  "Non-Fiction": IMG_POOL.books[1],
};

function catImg(name: string): string {
  return CAT_IMG[name] ?? IMG_POOL["home-kitchen"][0];
}

// Three category-relevant photos, rotated by the product's index for variety.
function productImgs(type: LeafType, index: number): string[] {
  const pool = IMG_POOL[type] ?? IMG_POOL["home-kitchen"];
  return [0, 1, 2].map((k) => pool[(index + k) % pool.length]);
}

function firstImg(images: Prisma.JsonValue | null): string | null {
  return Array.isArray(images) && typeof images[0] === "string"
    ? images[0]
    : null;
}

const INDIAN_STATES = [
  "Maharashtra", "Karnataka", "Tamil Nadu", "Delhi", "Gujarat",
  "Rajasthan", "West Bengal", "Telangana", "Kerala", "Punjab",
  "Uttar Pradesh", "Haryana", "Madhya Pradesh", "Bihar", "Odisha",
];

function indianPhone(): string {
  return `+91${pick(["6", "7", "8", "9"])}${faker.string.numeric(9)}`;
}

function indianPin(): string {
  return faker.number.int({ min: 110001, max: 899999 }).toString();
}

const ratingWeighted = (): number =>
  faker.helpers.weightedArrayElement([
    { weight: 40, value: 5 },
    { weight: 30, value: 4 },
    { weight: 15, value: 3 },
    { weight: 10, value: 2 },
    { weight: 5, value: 1 },
  ]);

// Product name + pricing + tags, keyed by leaf-category type.
type LeafType =
  | "smartphones" | "laptops" | "mens-wear"
  | "womens-wear" | "home-kitchen" | "books";

function genName(type: LeafType): string {
  switch (type) {
    case "smartphones":
      return `${pick(["Galaxy", "Pixel", "Redmi", "OnePlus", "Realme", "iQOO"])} ${pick(["Pro", "Note", "Ultra", "Neo", "Max"])} ${pick(["5G", ""])} ${pick(["64GB", "128GB", "256GB"])}`
        .replace(/\s+/g, " ")
        .trim();
    case "laptops":
      return `${pick(["UltraBook", "ThinkPad", "Inspiron", "VivoBook", "Aspire", "ROG"])} ${pick(["14", "15", "16"])} ${pick(["i5", "i7", "Ryzen 5", "Ryzen 7"])} ${pick(["512GB", "1TB"])}`;
    case "mens-wear":
      return `Men's ${pick(["Slim Fit", "Regular Fit", "Casual"])} ${pick(["Cotton", "Linen", "Denim"])} ${pick(["Shirt", "T-Shirt", "Trousers", "Jeans", "Jacket"])}`;
    case "womens-wear":
      return `Women's ${pick(["Floral", "Embroidered", "Printed", "Solid"])} ${pick(["Kurti", "Dress", "Top", "Saree", "Jeans"])}`;
    case "home-kitchen":
      return `${pick(["Stainless Steel", "Non-Stick", "Ceramic", "Glass"])} ${pick(["Cookware Set", "Water Bottle", "Dinner Set", "Storage Container", "Pressure Cooker"])}`;
    case "books":
      return faker.book.title();
  }
}

function genPrice(type: LeafType): number {
  switch (type) {
    case "smartphones": return faker.number.int({ min: 8000, max: 80000 });
    case "laptops": return faker.number.int({ min: 30000, max: 150000 });
    case "mens-wear":
    case "womens-wear": return faker.number.int({ min: 500, max: 5000 });
    case "home-kitchen": return faker.number.int({ min: 300, max: 10000 });
    case "books": return faker.number.int({ min: 150, max: 1500 });
  }
}

const TAGS: Record<LeafType, string[]> = {
  "smartphones": ["5g", "android", "dual-sim", "amoled", "fast-charging", "camera"],
  "laptops": ["ssd", "intel", "amd", "gaming", "ultrabook", "backlit"],
  "mens-wear": ["cotton", "slim-fit", "casual", "formal", "summer", "denim"],
  "womens-wear": ["ethnic", "floral", "casual", "party", "cotton", "trendy"],
  "home-kitchen": ["steel", "non-stick", "bpa-free", "dishwasher-safe", "durable"],
  "books": ["fiction", "bestseller", "paperback", "non-fiction", "classic"],
};

// ── 1. CLEAN (reverse dependency order) ─────────────────────────────────────────
async function clean() {
  console.log("\n🧹 Cleaning existing data…");
  const steps: [string, () => Promise<unknown>][] = [
    ["reviews", () => prisma.review.deleteMany()],
    ["returns", () => prisma.return.deleteMany()],
    ["order_items", () => prisma.orderItem.deleteMany()],
    ["orders", () => prisma.order.deleteMany()],
    ["cart_items", () => prisma.cartItem.deleteMany()],
    ["carts", () => prisma.cart.deleteMany()],
    ["addresses", () => prisma.address.deleteMany()],
    ["products", () => prisma.product.deleteMany()],
    // Sub-categories first (self-referencing parentId FK), then parents.
    ["categories (children)", () => prisma.category.deleteMany({ where: { parentId: { not: null } } })],
    ["categories (parents)", () => prisma.category.deleteMany({ where: { parentId: null } })],
    ["error_logs", () => prisma.errorLog.deleteMany()],
    ["audit_logs", () => prisma.auditLog.deleteMany()],
    ["two_factors", () => prisma.twoFactor.deleteMany()],
    ["password_resets", () => prisma.passwordReset.deleteMany()],
    ["verifications", () => prisma.verification.deleteMany()],
    ["sessions", () => prisma.session.deleteMany()],
    ["accounts", () => prisma.account.deleteMany()],
    ["users", () => prisma.user.deleteMany()],
  ];

  for (const [label, fn] of steps) {
    try {
      await fn();
      console.log(`  ✓ cleared ${label}`);
    } catch (e) {
      console.log(`  ⚠ ${label}: ${(e as Error).message}`);
    }
  }
}

// ── 2. USERS + ACCOUNTS ─────────────────────────────────────────────────────────
async function seedUsers() {
  type Spec = {
    name: string; email: string; role: string;
    emailVerified: boolean; isActive: boolean;
    banned: boolean; banReason: string | null;
  };

  // Exactly one account per role — admin · shop_manager · support · customer.
  const specs: Spec[] = [
    { name: "Admin", email: "admin@shop.com", role: "admin", emailVerified: true, isActive: true, banned: false, banReason: null },
    { name: "Shop Manager", email: "manager@shop.com", role: "shop_manager", emailVerified: true, isActive: true, banned: false, banReason: null },
    { name: "Support Agent", email: "support@shop.com", role: "support", emailVerified: true, isActive: true, banned: false, banReason: null },
    { name: "Test Customer", email: "customer@shop.com", role: "customer", emailVerified: true, isActive: true, banned: false, banReason: null },
  ];

  // Same password for all — hash once.
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const allUsers = [];
  const accountsData: Prisma.AccountCreateManyInput[] = [];
  for (const spec of specs) {
    // User needs its generated id to set Account.providerAccountId, so create
    // individually (the account batch goes in one createMany afterwards).
    const u = await prisma.user.create({
      data: {
        name: spec.name,
        email: spec.email,
        role: spec.role,
        emailVerified: spec.emailVerified,
        isActive: spec.isActive,
        banned: spec.banned,
        banReason: spec.banReason,
        // Spread signups across the last ~40 days so the dashboard's
        // "new customers" trend has a realistic shape.
        createdAt: faker.date.recent({ days: 40 }),
      },
    });
    allUsers.push(u);
    accountsData.push({
      userId: u.id,
      provider: "credential",
      providerAccountId: u.id,
      password: passwordHash,
    });
  }
  await prisma.account.createMany({ data: accountsData });

  console.log(`✓ Seeded ${allUsers.length} users (+ ${accountsData.length} credential accounts)`);
  return allUsers;
}

// ── 3. CATEGORIES (hierarchy) ───────────────────────────────────────────────────
async function seedCategories() {
  let sortOrder = 0;
  const parents: Record<string, { id: string }> = {};
  for (const name of ["Electronics", "Fashion", "Home & Kitchen", "Books"]) {
    parents[name] = await prisma.category.create({
      data: {
        name,
        slug: kebab(name),
        description: faker.commerce.productDescription(),
        image: catImg(name),
        isActive: true,
        sortOrder: sortOrder++,
      },
    });
  }

  const subDefs: [string, string][] = [
    ["Smartphones", "Electronics"],
    ["Laptops", "Electronics"],
    ["Men's Wear", "Fashion"],
    ["Women's Wear", "Fashion"],
    ["Cookware", "Home & Kitchen"],
    ["Tableware", "Home & Kitchen"],
    ["Fiction", "Books"],
    ["Non-Fiction", "Books"],
  ];
  const subs: Record<string, { id: string }> = {};
  for (const [name, parent] of subDefs) {
    subs[name] = await prisma.category.create({
      data: {
        name,
        slug: kebab(name),
        description: faker.commerce.productDescription(),
        image: catImg(name),
        isActive: true,
        sortOrder: sortOrder++,
        parentId: parents[parent].id,
      },
    });
  }

  console.log("✓ Seeded 12 categories (4 parents + 8 subcategories)");

  // Leaf categories (no children) — products attach here. Every parent now has
  // non-empty children, so the storefront mega menu + filters never surface an
  // empty top-level category.
  const leaves: { id: string; type: LeafType }[] = [
    { id: subs["Smartphones"].id, type: "smartphones" },
    { id: subs["Laptops"].id, type: "laptops" },
    { id: subs["Men's Wear"].id, type: "mens-wear" },
    { id: subs["Women's Wear"].id, type: "womens-wear" },
    { id: subs["Cookware"].id, type: "home-kitchen" },
    { id: subs["Tableware"].id, type: "home-kitchen" },
    { id: subs["Fiction"].id, type: "books" },
    { id: subs["Non-Fiction"].id, type: "books" },
  ];
  return leaves;
}

// ── 4. PRODUCTS ─────────────────────────────────────────────────────────────────
async function seedProducts(leaves: { id: string; type: LeafType }[]) {
  // Pre-pick which products are inactive (≈10%) and featured (12), keeping the
  // two sets disjoint so featured products are always active. Total scales with
  // the number of leaf categories (10 products each).
  const total = leaves.length * 10;
  const allIdx = [...Array(total).keys()];
  const inactiveIdx = new Set(
    faker.helpers.arrayElements(allIdx, Math.round(total * 0.1))
  );
  const activeIdx = allIdx.filter((i) => !inactiveIdx.has(i));
  const featuredIdx = new Set(faker.helpers.arrayElements(activeIdx, 12));

  const data: Prisma.ProductCreateManyInput[] = [];
  let gi = 0;
  for (const leaf of leaves) {
    for (let i = 0; i < 10; i++) {
      const name = genName(leaf.type);
      const price = genPrice(leaf.type);
      const comparePrice = faker.datatype.boolean(0.3)
        ? Math.round(price * faker.number.float({ min: 1.2, max: 1.5 }))
        : null;
      // First 5 products → out of stock; next 5 → low stock; rest healthy.
      const stock =
        gi < 5 ? 0 : gi < 10 ? faker.number.int({ min: 1, max: 5 }) : faker.number.int({ min: 10, max: 100 });

      data.push({
        name,
        // Deterministic suffix (global index) so slugs stay STABLE across
        // reseeds — a random nanoid would break every product URL on each seed.
        slug: `${kebab(name)}-${gi}`,
        description: faker.commerce.productDescription(),
        price,
        comparePrice,
        costPrice: Math.round(price * 0.6),
        sku: `SKU-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`,
        stock,
        lowStockAt: 5,
        categoryId: leaf.id,
        images: productImgs(leaf.type, i),
        tags: faker.helpers.arrayElements(TAGS[leaf.type], { min: 2, max: 4 }),
        isActive: !inactiveIdx.has(gi),
        isFeatured: featuredIdx.has(gi),
      });
      gi++;
    }
  }

  await prisma.product.createMany({ data });
  const products = await prisma.product.findMany();
  console.log(`✓ Seeded ${products.length} products (5 out-of-stock, 5 low-stock, 12 featured)`);
  return products;
}

// ── 5. ADDRESSES ────────────────────────────────────────────────────────────────
async function seedAddresses(customers: { id: string }[]) {
  const data: Prisma.AddressCreateManyInput[] = [];
  let made = 0;
  for (const c of faker.helpers.shuffle([...customers])) {
    if (made >= 30) break;
    const count = pick([1, 1, 2, 3]); // biased toward a single address
    for (let k = 0; k < count && made < 30; k++) {
      data.push({
        userId: c.id,
        label: pick(["Home", "Office", "Other"]),
        fullName: faker.person.fullName(),
        phone: indianPhone(),
        line1: faker.location.streetAddress(),
        line2: faker.datatype.boolean() ? faker.location.secondaryAddress() : null,
        city: faker.location.city(),
        state: pick(INDIAN_STATES),
        postalCode: indianPin(),
        country: "IN",
        isDefault: k === 0, // exactly one default per user
      });
      made++;
    }
  }

  await prisma.address.createMany({ data });
  const addresses = await prisma.address.findMany();
  const byUser = new Map<string, { id: string }[]>();
  for (const a of addresses) {
    const list = byUser.get(a.userId) ?? [];
    list.push(a);
    byUser.set(a.userId, list);
  }
  console.log(`✓ Seeded ${addresses.length} addresses across ${byUser.size} customers`);
  return byUser;
}

// ── 6. REVIEWS ──────────────────────────────────────────────────────────────────
async function seedReviews(
  products: { id: string }[],
  customers: { id: string }[]
) {
  const data: Prisma.ReviewCreateManyInput[] = [];
  for (const p of products) {
    const n = faker.number.int({ min: 0, max: 6 });
    if (n === 0) continue;
    // arrayElements returns DISTINCT users → satisfies @@unique([userId, productId]).
    const reviewers = faker.helpers.arrayElements(customers, Math.min(n, customers.length));
    for (const u of reviewers) {
      const createdAt = faker.date.recent({ days: 180 });
      // "New" = arrived in the last 7 days → still unseen by admin (drives the
      // reviews badge); everything older is treated as already seen.
      const seenByAdmin = Date.now() - createdAt.getTime() > 7 * 86_400_000;
      data.push({
        userId: u.id,
        productId: p.id,
        rating: ratingWeighted(),
        title: faker.lorem.sentence({ min: 2, max: 5 }).replace(/\.$/, ""),
        body: faker.lorem.sentences({ min: 1, max: 2 }),
        isVisible: faker.datatype.boolean(0.95),
        seenByAdmin,
        createdAt,
      });
    }
  }
  await prisma.review.createMany({ data });
  console.log(`✓ Seeded ${data.length} reviews`);
  return data.length;
}

// ── 7. ORDERS + ORDER ITEMS ─────────────────────────────────────────────────────
function payStatusFor(status: string): string {
  if (status === "delivered" || status === "shipped") return "paid";
  if (status === "pending") return "unpaid";
  if (status === "cancelled")
    return faker.helpers.weightedArrayElement([
      { weight: 50, value: "unpaid" },
      { weight: 30, value: "refunded" },
      { weight: 20, value: "paid" },
    ]);
  // processing / confirmed
  return faker.helpers.weightedArrayElement([
    { weight: 70, value: "paid" },
    { weight: 30, value: "unpaid" },
  ]);
}

async function seedOrders(
  customers: { id: string }[],
  addrByUser: Map<string, { id: string }[]>,
  products: { id: string; name: string; price: Prisma.Decimal; images: Prisma.JsonValue | null; isActive: boolean }[]
) {
  const withAddr = customers.filter((c) => addrByUser.has(c.id));
  const active = products.filter((p) => p.isActive);
  const usedNumbers = new Set<string>();
  let itemCount = 0;

  for (let o = 0; o < 40; o++) {
    const c = pick(withAddr);
    const address = pick(addrByUser.get(c.id)!);
    const chosen = faker.helpers.arrayElements(active, faker.number.int({ min: 1, max: 5 }));

    const items = chosen.map((p) => {
      const quantity = faker.number.int({ min: 1, max: 3 });
      const price = Number(p.price);
      return {
        productId: p.id,
        name: p.name, // snapshot at order time
        price,
        quantity,
        total: price * quantity,
        image: firstImg(p.images),
      };
    });

    const subtotal = items.reduce((s, it) => s + it.total, 0);
    const tax = Math.round(subtotal * 0.18);
    const shipping = subtotal > 999 ? 0 : 99;
    const total = subtotal + tax + shipping;

    const status = faker.helpers.weightedArrayElement([
      { weight: 30, value: "delivered" },
      { weight: 20, value: "shipped" },
      { weight: 20, value: "processing" },
      { weight: 15, value: "confirmed" },
      { weight: 10, value: "pending" },
      { weight: 5, value: "cancelled" },
    ]);
    const paymentStatus = payStatusFor(status);
    const paymentMethod = faker.helpers.weightedArrayElement([
      { weight: 60, value: "razorpay" },
      { weight: 40, value: "cod" },
    ]);

    let orderNumber: string;
    do {
      orderNumber = `ORD-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`;
    } while (usedNumbers.has(orderNumber));
    usedNumbers.add(orderNumber);

    const createdAt = faker.date.recent({ days: 90 }); // spread for revenue charts
    // Delivered orders carry a deliveredAt (created + 12–120h, capped at now) so
    // the dashboard's avg-fulfillment metric and return window have real data.
    const deliveredAt =
      status === "delivered"
        ? new Date(
            Math.min(
              Date.now(),
              createdAt.getTime() +
                faker.number.int({ min: 12, max: 120 }) * 3_600_000
            )
          )
        : null;

    await prisma.order.create({
      data: {
        orderNumber,
        userId: c.id,
        addressId: address.id,
        status,
        paymentStatus,
        paymentMethod,
        paymentId:
          paymentMethod === "razorpay" && paymentStatus === "paid"
            ? `pay_${faker.string.alphanumeric(14)}`
            : null,
        subtotal,
        tax,
        shipping,
        discount: 0,
        total,
        // A brand-new (still "pending") order hasn't been opened by an admin yet
        // → unseen (drives the new-orders badge); anything further along is seen.
        seenByAdmin: status !== "pending",
        deliveredAt,
        trackingNumber:
          status === "shipped" || status === "delivered"
            ? `TRK${faker.string.numeric(10)}`
            : null,
        createdAt,
        items: { create: items },
      },
    });
    itemCount += items.length;
  }

  console.log(`✓ Seeded 40 orders (${itemCount} order items)`);
  return itemCount;
}

// ── 7b. RETURNS (on delivered orders) ───────────────────────────────────────────
async function seedReturns() {
  const delivered = await prisma.order.findMany({
    where: { status: "delivered" },
    select: { id: true, userId: true },
  });
  const chosen = faker.helpers.arrayElements(
    delivered,
    Math.ceil(delivered.length * 0.25)
  );
  let n = 0;
  for (const o of chosen) {
    const status = faker.helpers.weightedArrayElement([
      { weight: 40, value: "requested" },
      { weight: 25, value: "approved" },
      { weight: 20, value: "completed" },
      { weight: 15, value: "rejected" },
    ]);
    await prisma.return.create({
      data: {
        orderId: o.id,
        userId: o.userId,
        reason: pick([
          "Wrong size",
          "Damaged on arrival",
          "Not as described",
          "Changed my mind",
          "Defective item",
        ]),
        status,
        restocked: status === "approved" || status === "completed",
        seenByAdmin: status !== "requested",
        adminNote: status === "rejected" ? "Outside the return window." : null,
        resolvedAt: status === "requested" ? null : new Date(),
      },
    });
    n++;
  }
  console.log(`✓ Seeded ${n} returns`);
}

// ── 8. CARTS + CART ITEMS ───────────────────────────────────────────────────────
async function seedCarts(
  customers: { id: string }[],
  products: { id: string; isActive: boolean }[]
) {
  const active = products.filter((p) => p.isActive);
  // Distinct customers (Cart.userId is @unique).
  const chosenCustomers = faker.helpers.arrayElements(customers, Math.min(20, customers.length));
  let itemCount = 0;

  for (const c of chosenCustomers) {
    // arrayElements → distinct products, satisfying @@unique([cartId, productId]).
    const chosen = faker.helpers.arrayElements(active, faker.number.int({ min: 1, max: 4 }));
    await prisma.cart.create({
      data: {
        userId: c.id,
        items: {
          create: chosen.map((p) => ({
            productId: p.id,
            quantity: faker.number.int({ min: 1, max: 3 }),
          })),
        },
      },
    });
    itemCount += chosen.length;
  }

  console.log(`✓ Seeded ${chosenCustomers.length} carts (${itemCount} cart items)`);
  return { carts: chosenCustomers.length, items: itemCount };
}

// ── 9. AUDIT LOGS ───────────────────────────────────────────────────────────────
async function seedAuditLogs(users: { id: string }[]) {
  const data: Prisma.AuditLogCreateManyInput[] = [];
  for (let i = 0; i < 120; i++) {
    const action = faker.helpers.weightedArrayElement([
      { weight: 35, value: "login_success" },
      { weight: 15, value: "login_failed" },
      { weight: 10, value: "register" },
      { weight: 15, value: "order_placed" },
      { weight: 8, value: "password_changed" },
      { weight: 12, value: "profile_updated" },
      { weight: 5, value: "role_changed" },
    ]);
    const failed = action === "login_failed";
    // A failed login may have no resolved user (unknown email).
    const userId = failed && faker.datatype.boolean(0.3) ? null : pick(users).id;

    const row: Prisma.AuditLogCreateManyInput = {
      userId,
      action,
      ipAddress: faker.internet.ipv4(),
      userAgent: faker.internet.userAgent(),
      status: failed ? "failed" : "success",
      createdAt: faker.date.recent({ days: 30 }),
    };
    if (failed) row.metadata = { reason: "invalid_credentials" };
    else if (action === "order_placed")
      row.metadata = { orderNumber: `ORD-${faker.string.alphanumeric({ length: 8, casing: "upper" })}` };

    data.push(row);
  }

  await prisma.auditLog.createMany({ data });
  console.log(`✓ Seeded ${data.length} audit logs`);
  return data.length;
}

// ── 10. ERROR LOGS ────────────────────────────────────────────────────────────
// Realistic mix across levels + resolved/seen states so the admin error-logs
// page, its filters, and the sidebar "errors" badge (= unseen) have data.
async function seedErrorLogs() {
  const H = 3_600_000;
  const D = 24 * H;
  const now = Date.now();

  type Row = {
    level: string; message: string; stack?: string; code: string;
    statusCode: number; route: string; method: string;
    resolved: boolean; seenByAdmin: boolean; createdAt: Date;
  };

  const rows: Row[] = [
    { level: "error", message: "Unhandled exception in checkout: payment gateway timeout", stack: "Error: gateway timeout\n    at verifyPayment (checkout/verify-payment/route.ts:42)", code: "PAYMENT_TIMEOUT", statusCode: 500, route: "/api/checkout/verify-payment", method: "POST", resolved: false, seenByAdmin: false, createdAt: new Date(now - 2 * H) },
    { level: "error", message: "Database query failed: connection refused", stack: "PrismaClientKnownRequestError: connection refused\n    at getErrorLogs (error-log.service.ts:63)", code: "DB_CONNECTION", statusCode: 500, route: "/dashboard/error-logs", method: "GET", resolved: false, seenByAdmin: false, createdAt: new Date(now - 5 * H) },
    { level: "error", message: "TypeError: Cannot read properties of undefined (reading 'id')", stack: "TypeError: Cannot read properties of undefined\n    at OrderDetail (orders/[id]/page.tsx:88)", code: "RUNTIME_ERROR", statusCode: 500, route: "/dashboard/orders/abc123", method: "GET", resolved: false, seenByAdmin: false, createdAt: new Date(now - 8 * H) },
    { level: "warn", message: "Low stock: product SKU TSHIRT-RED-M dropped below threshold", code: "LOW_STOCK", statusCode: 200, route: "/api/admin/products", method: "PATCH", resolved: false, seenByAdmin: false, createdAt: new Date(now - 26 * H) },
    { level: "warn", message: "Slow query (1.8s) on /api/products listing", code: "SLOW_QUERY", statusCode: 200, route: "/api/products", method: "GET", resolved: false, seenByAdmin: true, createdAt: new Date(now - 2 * D) },
    { level: "info", message: "Razorpay webhook received: payment.captured", code: "WEBHOOK", statusCode: 200, route: "/api/webhooks/razorpay", method: "POST", resolved: false, seenByAdmin: true, createdAt: new Date(now - 30 * H) },
    { level: "error", message: "SMTP send failed: connection reset by peer", stack: "Error: ECONNRESET\n    at sendEmail (lib/email.ts:71)", code: "EMAIL_SEND", statusCode: 500, route: "/api/auth/request-password-reset", method: "POST", resolved: true, seenByAdmin: true, createdAt: new Date(now - 6 * D) },
    { level: "warn", message: "Deprecated API used: /auth/login (use /login)", code: "DEPRECATED", statusCode: 200, route: "/auth/login", method: "GET", resolved: true, seenByAdmin: true, createdAt: new Date(now - 9 * D) },
  ];

  await prisma.errorLog.createMany({ data: rows });
  console.log(`✓ Seeded ${rows.length} error logs`);
  return rows.length;
}

// ── main ────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding database…");

  await clean();

  console.log("\n📦 Seeding tables…");
  const users = await seedUsers();
  const customers = users.filter((u) => u.role === "customer");

  const leaves = await seedCategories();
  const products = await seedProducts(leaves);
  const addrByUser = await seedAddresses(customers);

  // Guarantee the customer account (customer@shop.com) has a default address so
  // the checkout flow can be exercised deterministically.
  const testUser = customers.find((u) => u.email === "customer@shop.com");
  if (testUser && !(await prisma.address.findFirst({ where: { userId: testUser.id } }))) {
    await prisma.address.create({
      data: {
        userId: testUser.id,
        label: "Home",
        fullName: "Test Customer",
        phone: "+919876500000",
        line1: "1 Test Street",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "IN",
        isDefault: true,
      },
    });
    console.log("✓ Ensured default address for customer@shop.com");
  }

  await seedReviews(products, customers);
  await seedOrders(customers, addrByUser, products);
  await seedReturns();
  await seedCarts(customers, products);
  await seedAuditLogs(users);
  await seedErrorLogs();
  await seedSettings(prisma); // store settings + email templates (upsert, idempotent)

  // ── Final summary ──
  const counts = {
    users: await prisma.user.count(),
    accounts: await prisma.account.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    addresses: await prisma.address.count(),
    reviews: await prisma.review.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    carts: await prisma.cart.count(),
    cartItems: await prisma.cartItem.count(),
    returns: await prisma.return.count(),
    auditLogs: await prisma.auditLog.count(),
    errorLogs: await prisma.errorLog.count(),
    storeSettings: await prisma.storeSetting.count(),
    emailTemplates: await prisma.emailTemplate.count(),
  };

  console.log("\n📊 Seed summary");
  console.table(counts);

  console.log("\n🔑 Login credentials (password for all: Password123!)");
  console.table([
    { role: "admin", email: "admin@shop.com" },
    { role: "shop_manager", email: "manager@shop.com" },
    { role: "support", email: "support@shop.com" },
    { role: "customer", email: "customer@shop.com" },
  ]);

  console.log("\n✅ Seeding complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
