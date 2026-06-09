import { describe, it, expect, beforeEach, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    emailTemplate: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    storeSetting: { findMany: vi.fn() },
    emailLog: { create: vi.fn() },
  },
}));

vi.mock("@/server/db", () => ({ default: prismaMock }));

import {
  isTemplateEnabled,
  toggleTemplate,
} from "@/server/services/email-template.service";
import { invalidateStoreConfigCache } from "@/server/services/settings.service";

beforeEach(() => {
  vi.resetAllMocks();
  invalidateStoreConfigCache();
  prismaMock.storeSetting.findMany.mockResolvedValue([]); // branding → defaults
  prismaMock.emailLog.create.mockResolvedValue({ id: "log1" });
});

describe("email-template.service", () => {
  it("isTemplateEnabled returns true when the row is missing (graceful default)", async () => {
    prismaMock.emailTemplate.findUnique.mockResolvedValue(null);
    expect(await isTemplateEnabled("does_not_exist")).toBe(true);
  });

  it("isTemplateEnabled honours a stored disabled flag", async () => {
    prismaMock.emailTemplate.findUnique.mockResolvedValue({ enabled: false });
    expect(await isTemplateEnabled("welcome")).toBe(false);
  });

  it("toggleTemplate flips enabled", async () => {
    prismaMock.emailTemplate.update.mockResolvedValue({
      key: "welcome",
      enabled: false,
    });
    await toggleTemplate("welcome", false);
    expect(prismaMock.emailTemplate.update).toHaveBeenCalledWith({
      where: { key: "welcome" },
      data: { enabled: false },
    });
  });
});

// The real sendEmail (the global setup mock is bypassed via importActual).
describe("sendEmail (DB-driven)", () => {
  const realEmail = () =>
    vi.importActual<typeof import("@/lib/email")>("@/lib/email");

  it("SKIPS delivery + logs 'skipped' when the template is disabled", async () => {
    const email = await realEmail();
    prismaMock.emailTemplate.findUnique.mockResolvedValue({
      enabled: false,
      subject: null,
      heading: null,
      introText: null,
      ctaLabel: null,
      footerNote: null,
    });

    const res = await email.sendEmail(
      email.orderDeliveredEmail("user@example.com", { orderNumber: "MS-1" })
    );

    expect(res).toEqual({ skipped: true, status: "skipped" });
    expect(prismaMock.emailLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateKey: "order_delivered",
          status: "skipped",
        }),
      })
    );
  });

  it("replaces {orderNumber} tokens in the subject and logs 'sent'", async () => {
    const email = await realEmail();
    prismaMock.emailTemplate.findUnique.mockResolvedValue(null); // → fallback copy

    await email.sendEmail(
      email.orderConfirmationEmail("user@example.com", {
        orderNumber: "MS-42",
        total: 100,
      })
    );

    expect(prismaMock.emailLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "sent",
          subject: "Order confirmed — MS-42",
        }),
      })
    );
  });
});
