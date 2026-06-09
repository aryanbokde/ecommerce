import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireAdmin, parseJsonBody } from "@/lib/api-auth";
import {
  getAllSettings,
  upsertManySettings,
} from "@/server/services/settings.service";

type SettingGroup = "general" | "commerce" | "social" | "seo";

// GET /api/admin/settings — all store settings grouped by group (admin only).
export const GET = withErrorHandler(async () => {
  await requireAdmin();

  const rows = await getAllSettings();
  const grouped: Record<string, Record<string, string>> = {
    general: {},
    commerce: {},
    social: {},
    seo: {},
  };
  for (const r of rows) {
    (grouped[r.group] ??= {})[r.key] = r.value;
  }

  return NextResponse.json({ success: true, data: grouped });
});

// Each section is an optional key→value map; values are plain strings.
const kv = z.record(z.string(), z.string().max(2000));
const bodySchema = z.object({
  general: kv.optional(),
  commerce: kv.optional(),
  social: kv.optional(),
  seo: kv.optional(),
});

// PUT /api/admin/settings — upsert settings, preserving each key's group (admin).
export const PUT = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin();
  const body = await parseJsonBody(req, bodySchema);

  let written = 0;
  for (const group of ["general", "commerce", "social", "seo"] as SettingGroup[]) {
    const section = body[group];
    if (section && Object.keys(section).length) {
      written += await upsertManySettings(section, group);
    }
  }

  // Storefront header/footer + SEO read these — refresh the cached render.
  revalidatePath("/", "layout");

  return NextResponse.json({ success: true, data: { written } });
});
