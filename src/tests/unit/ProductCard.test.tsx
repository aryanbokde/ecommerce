import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type { Product } from "@/types";

// Spies shared between the mock factories (hoisted above the imports) and the
// assertions below.
const { openCart, addItem, notifySuccess, notifyError } = vi.hoisted(() => ({
  openCart: vi.fn(),
  addItem: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

// next/image needs its Next-specific props stripped so it renders a plain <img>
// in jsdom (fill/priority/etc. are not valid DOM attributes).
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, priority, unoptimized, sizes, ...rest } = props;
    void fill;
    void priority;
    void unoptimized;
    void sizes;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

// useCart is a zustand selector hook; the card reads `openCart` and `addItem`
// (which transparently handles the DB cart or the logged-out guest cart).
vi.mock("@/hooks/useCart", () => ({
  useCart: (
    selector: (s: { openCart: () => void; addItem: () => unknown }) => unknown
  ) => selector({ openCart, addItem }),
}));

vi.mock("@/lib/notify", () => ({
  notifySuccess: (...args: unknown[]) => notifySuccess(...args),
  notifyError: (...args: unknown[]) => notifyError(...args),
}));

import { ProductCard } from "@/components/shared/ProductCard";

const product: Product = {
  id: "p1",
  name: "Test Widget",
  slug: "test-widget",
  price: 499,
  comparePrice: 999, // > price → on sale
  stock: 10,
  images: ["/img.jpg"],
  isActive: true,
  isFeatured: false,
  avgRating: 0,
  reviewCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("ProductCard", () => {
  it("renders the product name and price", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText("Test Widget")).toBeInTheDocument();
    expect(screen.getByText("₹499")).toBeInTheDocument();
  });

  it("shows a 'Sale' badge when comparePrice > price", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText("Sale")).toBeInTheDocument();
    // The struck-through compare price is also rendered.
    expect(screen.getByText("₹999")).toBeInTheDocument();
  });

  it("does NOT show a 'Sale' badge when there is no comparePrice", () => {
    render(<ProductCard product={{ ...product, comparePrice: null }} />);
    expect(screen.queryByText("Sale")).not.toBeInTheDocument();
  });

  it("adds the product via the cart store when Add to Cart is clicked", async () => {
    addItem.mockResolvedValue(true);

    render(<ProductCard product={product} />);
    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));

    // Delegates to useCart.addItem with a product snapshot + quantity 1.
    await waitFor(() => expect(addItem).toHaveBeenCalled());
    expect(addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "p1",
        name: "Test Widget",
        slug: "test-widget",
        stock: 10,
      }),
      1
    );

    // On success the cart drawer opens and a success toast fires.
    await waitFor(() => expect(openCart).toHaveBeenCalled());
    expect(notifySuccess).toHaveBeenCalled();
  });

  it("shows a loading state on the button while the add is in flight", async () => {
    let resolveAdd!: (value: boolean) => void;
    addItem.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveAdd = resolve;
      })
    );

    render(<ProductCard product={product} />);
    const button = screen.getByRole("button", { name: /add to cart/i });
    fireEvent.click(button);

    // While pending the button is disabled (spinner shown).
    await waitFor(() => expect(button).toBeDisabled());

    // Resolve → button re-enables.
    resolveAdd(true);
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
