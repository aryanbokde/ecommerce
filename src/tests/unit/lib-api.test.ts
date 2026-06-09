import { describe, it, expect, beforeEach, vi } from "vitest";
import { z } from "zod";

// @/lib/auth is mocked in setup.ts; grab the mocked getServerSession to drive it.
import { getServerSession } from "@/lib/auth";
import {
  requireUser,
  requireRoles,
  requireAdmin,
  requireStaff,
  parseJsonBody,
  parseQuery,
} from "@/lib/api-auth";

const mockSession = (role: string) =>
  (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: "u1", role },
  });

beforeEach(() => vi.clearAllMocks());

describe("api-auth — guards", () => {
  it("requireUser throws 401 with no session", async () => {
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      null
    );
    await expect(requireUser()).rejects.toMatchObject({ statusCode: 401 });
  });

  it("requireRoles allows an in-role user and 403s others", async () => {
    mockSession("admin");
    await expect(requireAdmin()).resolves.toMatchObject({
      user: { role: "admin" },
    });

    mockSession("customer");
    await expect(requireRoles(["admin"])).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("requireStaff accepts admin + shop_manager", async () => {
    mockSession("shop_manager");
    await expect(requireStaff()).resolves.toBeTruthy();
  });
});

describe("api-auth — parsing", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("parseJsonBody returns parsed data on a valid body", async () => {
    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify({ name: "ok" }),
    });
    await expect(parseJsonBody(req, schema)).resolves.toEqual({ name: "ok" });
  });

  it("parseJsonBody 422s on invalid JSON and on schema failure", async () => {
    const bad = new Request("http://x", { method: "POST", body: "not json" });
    await expect(parseJsonBody(bad, schema)).rejects.toMatchObject({
      statusCode: 422,
    });

    const wrong = new Request("http://x", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    });
    await expect(parseJsonBody(wrong, schema)).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it("parseQuery validates URLSearchParams", () => {
    const qschema = z.object({ page: z.coerce.number().int().min(1) });
    expect(parseQuery(new URLSearchParams("page=2"), qschema)).toEqual({
      page: 2,
    });
    expect(() => parseQuery(new URLSearchParams("page=0"), qschema)).toThrow();
  });
});

// ── with-error-handler ───────────────────────────────────────────────────────
vi.mock("@/lib/logger", () => ({
  default: { http: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  logError: vi.fn(),
}));

import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { AppError, ErrorCode } from "@/lib/api-error";

const req = () => new NextRequest("http://localhost/api/test", { method: "GET" });

describe("with-error-handler", () => {
  it("passes a successful response through", async () => {
    const handler = withErrorHandler(async () =>
      NextResponse.json({ ok: true })
    );
    const res = await handler(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("maps a thrown AppError to its status + structured body", async () => {
    const handler = withErrorHandler(async () => {
      throw new AppError("missing", ErrorCode.NOT_FOUND, 404);
    });
    const res = await handler(req());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "missing", code: "NOT_FOUND" });
  });

  it("maps a generic error to 500", async () => {
    const handler = withErrorHandler(async () => {
      throw new Error("kaboom");
    });
    const res = await handler(req());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("kaboom");
  });
});
