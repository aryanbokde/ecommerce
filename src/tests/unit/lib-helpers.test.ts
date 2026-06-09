import { describe, it, expect, vi, beforeEach } from "vitest";

// ── api-error ─────────────────────────────────────────────────────────────────
import {
  AppError,
  ErrorCode,
  isAppError,
  parseApiError,
} from "@/lib/api-error";

describe("api-error", () => {
  it("AppError carries message/code/status and isAppError narrows it", () => {
    const e = new AppError("nope", ErrorCode.NOT_FOUND, 404);
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe(ErrorCode.NOT_FOUND);
    expect(isAppError(e)).toBe(true);
    expect(isAppError(new Error("x"))).toBe(false);
  });

  it("parseApiError maps an axios error by status", () => {
    const axiosErr = {
      isAxiosError: true,
      response: { status: 403, data: { message: "denied" } },
      message: "Request failed",
    };
    const r = parseApiError(axiosErr);
    expect(r.statusCode).toBe(403);
    expect(r.code).toBe(ErrorCode.FORBIDDEN);
    expect(r.message).toBe("denied");
  });

  it("parseApiError handles a thrown Response and a native Error", () => {
    const fromResponse = parseApiError(
      new Response("x", { status: 404, statusText: "Not Found" })
    );
    expect(fromResponse.statusCode).toBe(404);

    const fromError = parseApiError(new Error("kaboom"));
    expect(fromError.statusCode).toBe(500);
    expect(fromError.code).toBe(ErrorCode.SERVER_ERROR);

    const fromUnknown = parseApiError("weird");
    expect(fromUnknown.statusCode).toBe(500);
  });
});

// ── seo ───────────────────────────────────────────────────────────────────────
import {
  buildMetadata,
  buildProductMetadata,
  buildCategoryMetadata,
} from "@/lib/seo";

describe("seo", () => {
  it("buildMetadata merges overrides over the base", () => {
    const m = buildMetadata({ title: "Cart" });
    expect(m.title).toBe("Cart");
    expect(m.description).toBe("Your one-stop ecommerce store");
  });

  it("buildProductMetadata sets OG + twitter image", () => {
    const m = buildProductMetadata({
      name: "Shoe",
      description: "Nice shoe",
      image: "/shoe.jpg",
      price: 999,
    });
    expect(m.title).toBe("Shoe");
    // @ts-expect-error narrow OG images shape for the assertion
    expect(m.openGraph?.images?.[0]?.url).toBe("/shoe.jpg");
  });

  it("buildCategoryMetadata sets the category title", () => {
    const m = buildCategoryMetadata({ name: "Shoes", description: "All shoes" });
    expect(m.title).toBe("Shoes");
  });
});

// ── session-guard ───────────────────────────────────────────────────────────────
import {
  getSessionPayload,
  unauthorized,
  forbidden,
} from "@/lib/session-guard";

describe("session-guard (stub)", () => {
  it("getSessionPayload always returns null", async () => {
    const payload = await getSessionPayload({} as never);
    expect(payload).toBeNull();
  });

  it("unauthorized/forbidden return the right status codes", () => {
    expect(unauthorized().status).toBe(401);
    expect(forbidden().status).toBe(403);
  });
});

// ── notify ───────────────────────────────────────────────────────────────────
import { toast } from "sonner";
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
  notifyLoading,
  notifyDismiss,
  notifyPromise,
} from "@/lib/notify";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
  }),
}));

describe("notify", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forwards each helper to the matching sonner call", () => {
    notifySuccess("a", "b");
    expect(toast.success).toHaveBeenCalledWith("a", { description: "b" });
    notifyError("c");
    expect(toast.error).toHaveBeenCalledWith("c", { description: undefined });
    notifyWarning("w");
    expect(toast.warning).toHaveBeenCalled();
    notifyInfo("i");
    expect(toast.info).toHaveBeenCalled();
    notifyLoading("l");
    expect(toast.loading).toHaveBeenCalledWith("l");
    notifyDismiss(5);
    expect(toast.dismiss).toHaveBeenCalledWith(5);
    const p = Promise.resolve(1);
    notifyPromise(p, { loading: "l", success: "s", error: "e" });
    expect(toast.promise).toHaveBeenCalled();
  });
});

// ── export-csv ───────────────────────────────────────────────────────────────
import { exportToCsv } from "@/lib/export-csv";

describe("export-csv", () => {
  beforeEach(() => {
    // jsdom lacks object URL APIs.
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
  });

  it("no-ops on empty rows", () => {
    const spy = vi.spyOn(document, "createElement");
    exportToCsv("empty", []);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("builds a download with the union of keys and a .csv name", () => {
    const click = vi.fn();
    const orig = document.createElement.bind(document);
    const spy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = orig(tag) as HTMLAnchorElement;
      if (tag === "a") el.click = click;
      return el;
    });

    let anchor: HTMLAnchorElement | undefined;
    const appendSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation((node) => {
        anchor = node as HTMLAnchorElement;
        return node;
      });
    vi.spyOn(document.body, "removeChild").mockImplementation((n) => n);

    exportToCsv("orders", [{ a: 1 }, { a: 2, b: "x,y" }]);

    expect(click).toHaveBeenCalled();
    expect(anchor?.download).toBe("orders.csv");

    spy.mockRestore();
    appendSpy.mockRestore();
  });

  it("escapes cells containing commas/quotes/newlines", async () => {
    // Capture the Blob handed to createObjectURL and read its text.
    let captured: Blob | undefined;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      captured = blob;
      return "blob:mock";
    });
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);
    vi.spyOn(document.body, "removeChild").mockImplementation((n) => n);

    exportToCsv("t", [{ note: 'has "quote", and comma' }]);

    const text = await captured!.text();
    expect(text).toContain('"has ""quote"", and comma"');
  });
});
