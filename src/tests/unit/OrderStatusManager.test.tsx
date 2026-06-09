import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  OrderStatusManager,
  validNextStatuses,
} from "@/components/admin/OrderStatusManager";

afterEach(cleanup);

describe("validNextStatuses", () => {
  it("allows only the next pipeline step plus cancel", () => {
    expect(validNextStatuses("pending")).toEqual(["confirmed", "cancelled"]);
    expect(validNextStatuses("confirmed")).toEqual(["processing", "cancelled"]);
    expect(validNextStatuses("processing")).toEqual(["shipped", "cancelled"]);
    expect(validNextStatuses("shipped")).toEqual(["delivered", "cancelled"]);
  });

  it("treats delivered and cancelled as terminal", () => {
    expect(validNextStatuses("delivered")).toEqual([]);
    expect(validNextStatuses("cancelled")).toEqual([]);
  });

  it("never offers the current status as a next option", () => {
    for (const status of [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ]) {
      expect(validNextStatuses(status)).not.toContain(status);
    }
  });
});

describe("OrderStatusManager", () => {
  it("offers a status update for a non-terminal order", () => {
    render(<OrderStatusManager orderId="o1" currentStatus="pending" />);
    expect(screen.getByText("Update Status")).toBeInTheDocument();
  });

  it("shows a terminal message and no update control for delivered orders", () => {
    render(<OrderStatusManager orderId="o2" currentStatus="delivered" />);
    expect(screen.queryByText("Update Status")).not.toBeInTheDocument();
    expect(
      screen.getByText(/No further status changes are possible/i)
    ).toBeInTheDocument();
  });
});
