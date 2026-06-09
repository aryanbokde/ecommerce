import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireStaff } from "@/lib/api-auth";
import prisma from "@/server/db";

// GET /api/admin/categories — staff. Flat list of ALL categories (active and
// inactive) with product counts, for the management tree. The public
// /api/categories tree excludes inactive categories and omits counts.
export const GET = withErrorHandler(async () => {
  await requireStaff();

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json({
    success: true,
    message: "Categories fetched",
    data: categories.map(({ _count, ...c }) => ({
      ...c,
      productCount: _count.products,
    })),
  });
});
