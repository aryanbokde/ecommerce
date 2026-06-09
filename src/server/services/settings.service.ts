import "server-only";

import prisma from "@/server/db";

// ── Settings service ──────────────────────────────────────────────────────────
// Key/value store config the admin can edit. `getStoreConfig()` assembles a typed
// object (with sane defaults for any missing row) and is memoised for 60s since
// settings change rarely. Any write invalidates that cache.

export interface StoreConfig {
  storeName: string;
  storeLogo: string;
  storeAddress: string;
  storePhone: string;
  supportEmail: string;
  currency: string;
  taxPercent: number;
  socialLinks: { facebook?: string; instagram?: string; twitter?: string };
  // Order policy
  cancellationsEnabled: boolean;
  returnsEnabled: boolean;
  returnWindowDays: number;
}

const DEFAULTS: StoreConfig = {
  storeName: "MyShop",
  storeLogo: "",
  storeAddress: "Bengaluru, Karnataka, India",
  storePhone: "",
  supportEmail: process.env.EMAIL_SUPPORT ?? "support@myshop.local",
  currency: "INR",
  taxPercent: 18,
  socialLinks: {},
  cancellationsEnabled: true,
  returnsEnabled: true,
  returnWindowDays: 7,
};

// ── Raw key/value access ──────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.storeSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function getSettingsByGroup(group: string) {
  return prisma.storeSetting.findMany({
    where: { group },
    orderBy: { key: "asc" },
  });
}

export async function getAllSettings() {
  return prisma.storeSetting.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });
}

export async function upsertSetting(
  key: string,
  value: string,
  group = "general"
) {
  const row = await prisma.storeSetting.upsert({
    where: { key },
    update: { value, group },
    create: { key, value, group },
  });
  invalidateStoreConfigCache();
  return row;
}

/** Upsert many settings in one transaction. Returns the number written. */
export async function upsertManySettings(
  record: Record<string, string>,
  group = "general"
): Promise<number> {
  const entries = Object.entries(record);
  if (entries.length === 0) return 0;

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.storeSetting.upsert({
        where: { key },
        update: { value, group },
        create: { key, value, group },
      })
    )
  );
  invalidateStoreConfigCache();
  return entries.length;
}

// ── Typed, cached store config ────────────────────────────────────────────────

const CONFIG_TTL_MS = 60_000;

// Cache on globalThis (not a module variable): Next bundles route handlers and
// pages separately, so a module-scoped cache would NOT be shared between the
// settings API route (which invalidates) and the storefront layout (which reads)
// — leaving stale branding for up to the TTL. A global is shared process-wide.
const cacheStore = globalThis as unknown as {
  __storeConfigCache?: { data: StoreConfig; expires: number } | null;
};

export function invalidateStoreConfigCache(): void {
  cacheStore.__storeConfigCache = null;
}

export async function getStoreConfig(): Promise<StoreConfig> {
  const cached = cacheStore.__storeConfigCache;
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const rows = await prisma.storeSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const taxRaw = map.get("taxPercent");
  const taxPercent =
    taxRaw !== undefined && !Number.isNaN(Number(taxRaw))
      ? Number(taxRaw)
      : DEFAULTS.taxPercent;

  const windowRaw = map.get("returnWindowDays");
  const returnWindowDays =
    windowRaw !== undefined && Number.isFinite(Number(windowRaw))
      ? Math.max(0, Math.trunc(Number(windowRaw)))
      : DEFAULTS.returnWindowDays;
  const boolSetting = (key: string, fallback: boolean) => {
    const v = map.get(key);
    return v === undefined ? fallback : v === "true";
  };

  const data: StoreConfig = {
    storeName: map.get("storeName") ?? DEFAULTS.storeName,
    storeLogo: map.get("storeLogo") ?? DEFAULTS.storeLogo,
    storeAddress: map.get("storeAddress") ?? DEFAULTS.storeAddress,
    storePhone: map.get("storePhone") ?? DEFAULTS.storePhone,
    supportEmail: map.get("supportEmail") ?? DEFAULTS.supportEmail,
    currency: map.get("currency") ?? DEFAULTS.currency,
    taxPercent,
    socialLinks: {
      ...(map.get("socialFacebook") ? { facebook: map.get("socialFacebook") } : {}),
      ...(map.get("socialInstagram") ? { instagram: map.get("socialInstagram") } : {}),
      ...(map.get("socialTwitter") ? { twitter: map.get("socialTwitter") } : {}),
    },
    cancellationsEnabled: boolSetting(
      "cancellationsEnabled",
      DEFAULTS.cancellationsEnabled
    ),
    returnsEnabled: boolSetting("returnsEnabled", DEFAULTS.returnsEnabled),
    returnWindowDays,
  };

  cacheStore.__storeConfigCache = { data, expires: Date.now() + CONFIG_TTL_MS };
  return data;
}
