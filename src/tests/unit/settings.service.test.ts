import { describe, it, expect, beforeEach, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    storeSetting: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/db", () => ({ default: prismaMock }));

import {
  getStoreConfig,
  upsertManySettings,
  invalidateStoreConfigCache,
} from "@/server/services/settings.service";

beforeEach(() => {
  vi.resetAllMocks();
  invalidateStoreConfigCache(); // start each test with a cold cache
});

describe("settings.service", () => {
  it("getStoreConfig assembles a typed object with defaults when rows are missing", async () => {
    prismaMock.storeSetting.findMany.mockResolvedValue([]);

    const cfg = await getStoreConfig();

    expect(cfg).toMatchObject({
      storeName: "MyShop",
      currency: "INR",
      taxPercent: 18,
      socialLinks: {},
    });
    expect(cfg.supportEmail).toContain("@");
  });

  it("getStoreConfig reads stored values + parses social keys", async () => {
    prismaMock.storeSetting.findMany.mockResolvedValue([
      { key: "storeName", value: "Acme Store" },
      { key: "taxPercent", value: "12" },
      { key: "socialInstagram", value: "https://instagram.com/acme" },
    ]);

    const cfg = await getStoreConfig();

    expect(cfg.storeName).toBe("Acme Store");
    expect(cfg.taxPercent).toBe(12);
    expect(cfg.socialLinks).toEqual({ instagram: "https://instagram.com/acme" });
  });

  it("upsertManySettings writes each key (and returns the count)", async () => {
    prismaMock.$transaction.mockResolvedValue([]);

    const written = await upsertManySettings(
      { storeName: "Acme", currency: "USD" },
      "general"
    );

    expect(written).toBe(2);
    expect(prismaMock.storeSetting.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.storeSetting.upsert).toHaveBeenCalledWith({
      where: { key: "storeName" },
      update: { value: "Acme", group: "general" },
      create: { key: "storeName", value: "Acme", group: "general" },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("getStoreConfig caches the result within the 60s window (one DB read)", async () => {
    prismaMock.storeSetting.findMany.mockResolvedValue([
      { key: "storeName", value: "Cached Co" },
    ]);

    const first = await getStoreConfig();
    const second = await getStoreConfig();

    expect(first.storeName).toBe("Cached Co");
    expect(second).toBe(first); // same cached object reference
    expect(prismaMock.storeSetting.findMany).toHaveBeenCalledTimes(1);
  });
});
