import "@testing-library/jest-dom";
import { vi } from "vitest";

// ── next/navigation ────────────────────────────────────────────────────────────
// Server-side navigation APIs aren't available in jsdom; provide stubs.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push:     vi.fn(),
    replace:  vi.fn(),
    refresh:  vi.fn(),
    back:     vi.fn(),
    forward:  vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname:    vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect:       vi.fn(),
  notFound:       vi.fn(),
}));

// ── next/headers ───────────────────────────────────────────────────────────────
// Headers/cookies are only available in the Next.js server runtime.
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get:    vi.fn(),
    getAll: vi.fn(() => []),
    set:    vi.fn(),
    delete: vi.fn(),
    has:    vi.fn(() => false),
  })),
  headers: vi.fn(() => new Headers()),
}));
