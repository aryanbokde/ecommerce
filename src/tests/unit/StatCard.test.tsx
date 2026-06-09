import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { IndianRupee } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";

afterEach(cleanup);

describe("StatCard", () => {
  it("renders the title and value", () => {
    render(<StatCard title="Total Revenue" value="₹12,500" icon={IndianRupee} />);
    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getByText("₹12,500")).toBeInTheDocument();
  });

  it("shows a positive trend with an up indicator", () => {
    render(
      <StatCard
        title="Revenue"
        value="₹1,000"
        icon={IndianRupee}
        trend={12.3}
        trendLabel="vs last month"
      />
    );
    expect(screen.getByText("12.3%")).toBeInTheDocument();
    expect(screen.getByText("vs last month")).toBeInTheDocument();
  });

  it("renders a negative trend as a down value", () => {
    render(<StatCard title="Orders" value={42} icon={IndianRupee} trend={-5} />);
    // Sign is conveyed by color/arrow; the magnitude is shown without a minus.
    expect(screen.getByText("5.0%")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("omits the trend badge when no trend is given", () => {
    render(<StatCard title="Products" value={7} icon={IndianRupee} />);
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });
});
