import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// @/lib/auth is mocked in setup.ts; drive its getServerSession.
import { getServerSession } from "@/lib/auth";
import { GET } from "@/app/api/admin/stats/route";

const setRole = (role: string | null) =>
  (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
    role ? { user: { id: "u1", role } } : null
  );

beforeEach(() => vi.clearAllMocks());

const req = () => new NextRequest("http://localhost/api/admin/stats");

describe("admin route guard (integration)", () => {
  it("403s a non-admin (customer) before doing any work", async () => {
    setRole("customer");
    const res = await GET(req());
    expect(res.status).toBe(403);
  });

  it("401s an unauthenticated request", async () => {
    setRole(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
});
