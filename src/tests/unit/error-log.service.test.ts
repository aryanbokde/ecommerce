import { describe, it, expect, beforeEach, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    errorLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/server/db", () => ({ default: prismaMock }));

import {
  saveErrorLog,
  getErrorLogs,
  resolveErrorLog,
  deleteErrorLog,
  getErrorStats,
} from "@/server/services/error-log.service";

beforeEach(() => vi.resetAllMocks());

describe("error-log.service (Prisma-backed)", () => {
  it("saveErrorLog persists with defaults (level=error, JsonNull metadata)", async () => {
    prismaMock.errorLog.create.mockResolvedValue({ id: "e1" });
    await saveErrorLog({ message: "boom" });
    const data = prismaMock.errorLog.create.mock.calls[0][0].data;
    expect(data.level).toBe("error");
    expect(data.message).toBe("boom");
    expect(data.stack).toBeNull();
  });

  it("getErrorLogs applies filters + returns a paginated envelope", async () => {
    prismaMock.errorLog.findMany.mockResolvedValue([{ id: "e1" }]);
    prismaMock.errorLog.count.mockResolvedValue(1);

    const res = await getErrorLogs({ level: "warn", resolved: false, page: 1, limit: 20 });

    const where = prismaMock.errorLog.findMany.mock.calls[0][0].where;
    expect(where.level).toBe("warn");
    expect(where.resolved).toBe(false);
    expect(res).toMatchObject({ total: 1, page: 1, totalPages: 1 });
  });

  it("resolveErrorLog marks an entry resolved", async () => {
    prismaMock.errorLog.update.mockResolvedValue({ id: "e1", resolved: true });
    await resolveErrorLog("e1");
    expect(prismaMock.errorLog.update).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: { resolved: true },
    });
  });

  it("deleteErrorLog removes an entry", async () => {
    prismaMock.errorLog.delete.mockResolvedValue({ id: "e1" });
    await deleteErrorLog("e1");
    expect(prismaMock.errorLog.delete).toHaveBeenCalledWith({ where: { id: "e1" } });
  });

  it("getErrorStats aggregates totals/levels/trends", async () => {
    // 8 counts: total, unresolved, error, warn, info, 24h, 7d, 30d
    prismaMock.errorLog.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(9);

    const s = await getErrorStats();
    expect(s.total).toBe(10);
    expect(s.unresolved).toBe(4);
    expect(s.byLevel).toEqual({ error: 7, warn: 2, info: 1 });
    expect(s.trends).toEqual({ last24h: 3, last7d: 6, last30d: 9 });
  });
});
