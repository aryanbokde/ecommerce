import { type NextRequest, NextResponse } from "next/server";
import { logError } from "@/lib/logger";

// Public endpoint — accepts client-side error reports from global-error.tsx
// and any other client components. No auth required.
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const {
      message,
      stack,
      digest,
      route,
    } = body as Record<string, unknown>;

    const error = new Error(
      typeof message === "string" ? message : "Unknown client error"
    );
    if (typeof stack === "string") error.stack = stack;

    logError(error, {
      route: typeof route === "string" ? route : "client",
      metadata: {
        source: "client",
        ...(typeof digest === "string" && { digest }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
