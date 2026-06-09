import { describe, it, expect, beforeEach, vi } from "vitest";
import { Prisma } from "@/generated/prisma";

const { prismaMock, loggerMock } = vi.hoisted(() => ({
  prismaMock: {
    auditLog: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  },
  loggerMock: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/server/db", () => ({ default: prismaMock }));
vi.mock("@/lib/logger", () => ({ default: loggerMock }));

import {
  logAudit,
  getAuditLogs,
  getRecentFailedLogins,
} from "@/server/services/audit-log.service";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("audit-log.service — logAudit", () => {
  it("persists with defaults (success status, JsonNull metadata)", async () => {
    prismaMock.auditLog.create.mockResolvedValue({ id: "a1" });

    await logAudit({ action: "login_success", userId: "u1" });

    const data = prismaMock.auditLog.create.mock.calls[0][0].data;
    expect(data.action).toBe("login_success");
    expect(data.userId).toBe("u1");
    expect(data.status).toBe("success");
    expect(data.metadata).toBe(Prisma.JsonNull);
  });

  it("never throws — a DB failure is swallowed and logged", async () => {
    prismaMock.auditLog.create.mockRejectedValue(new Error("db down"));

    await expect(logAudit({ action: "login_failed" })).resolves.toBeUndefined();
    expect(loggerMock.error).toHaveBeenCalled();
  });
});

describe("audit-log.service — getAuditLogs", () => {
  it("applies filters and returns a paginated envelope", async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([{ id: "a1" }]);
    prismaMock.auditLog.count.mockResolvedValue(1);

    const res = await getAuditLogs({
      userId: "u1",
      action: "order_placed",
      status: "success",
      from: new Date("2026-01-01"),
      page: 1,
      limit: 20,
    });

    const where = prismaMock.auditLog.findMany.mock.calls[0][0].where;
    expect(where.userId).toBe("u1");
    expect(where.action).toBe("order_placed");
    expect(where.createdAt.gte).toBeInstanceOf(Date);
    expect(res).toMatchObject({ total: 1, page: 1, totalPages: 1 });
  });
});

describe("audit-log.service — getRecentFailedLogins", () => {
  it("counts recent failed logins for an email", async () => {
    prismaMock.auditLog.count.mockResolvedValue(3);

    const n = await getRecentFailedLogins("a@b.c", 15);

    expect(n).toBe(3);
    const where = prismaMock.auditLog.count.mock.calls[0][0].where;
    expect(where.action).toBe("login_failed");
    expect(where.createdAt.gte).toBeInstanceOf(Date);
  });
});
