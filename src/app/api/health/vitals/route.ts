import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { withErrorHandler } from "@/lib/with-error-handler";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const metric = await req.json();
  logger.info("web-vital", { metric });
  return NextResponse.json({ ok: true });
});
