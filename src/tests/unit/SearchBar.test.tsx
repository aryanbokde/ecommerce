import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";

import { SearchBar } from "@/components/shared/SearchBar";

function mockSearch(products: unknown[]) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: async () => ({ data: { products } }),
  });
}

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("SearchBar", () => {
  it("renders a search toggle button (collapsed by default)", () => {
    render(<SearchBar />);
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  it("expands and focuses the input when the toggle is clicked", () => {
    render(<SearchBar />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    const input = screen.getByLabelText("Search products");
    expect(input).toHaveFocus();
    // Toggle now offers to close.
    expect(screen.getByRole("button", { name: "Close search" })).toBeInTheDocument();
  });

  it("debounces the API call by 400ms", async () => {
    vi.useFakeTimers();
    mockSearch([]);

    render(<SearchBar />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByLabelText("Search products"), {
      target: { value: "shirt" },
    });

    // Nothing fired before the debounce window elapses.
    expect(global.fetch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(399);
    });
    expect(global.fetch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/search?q=shirt")
    );
  });

  it("shows a results dropdown when products are returned", async () => {
    vi.useFakeTimers();
    mockSearch([
      { id: "p1", name: "Cool Shirt", slug: "cool-shirt", price: 25, images: [] },
    ]);

    render(<SearchBar />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByLabelText("Search products"), {
      target: { value: "cool" },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(screen.getByText("Cool Shirt")).toBeInTheDocument();
  });
});
