"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// Backend-only stylesheet (Cyan tokens + Inter/Poppins). Loaded here so it ships
// only with the dashboard bundles, not the storefront.
import "./backend-theme.css";

// ── Backend-only theme ───────────────────────────────────────────────────────
// The internal dashboards (admin · shop-manager · support) get their OWN
// light/dark theme, fully independent of the storefront's next-themes (which
// owns the global `.dark` on <html>). This provider keeps its state in
// localStorage (`backend-theme`) and paints a `.theme-cyan` wrapper that is:
//   • dark  → `theme-cyan dark`        (uses .theme-cyan.dark tokens)
//   • light → `theme-cyan theme-light` (uses .theme-cyan tokens; the
//             `theme-light` marker suppresses inherited `dark:` utilities — see
//             the `@custom-variant dark` override in globals.css)
// Because token vars are re-declared on the wrapper, the global html.dark from
// the storefront never bleeds in. Default is dark (dashboard aesthetic).

type Mode = "light" | "dark";

const BackendThemeContext = createContext<{ mode: Mode; toggle: () => void }>({
  mode: "dark",
  toggle: () => {},
});

export function useBackendTheme() {
  return useContext(BackendThemeContext);
}

export function BackendThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default "dark" on both server and first client render → no hydration
  // mismatch; the effect then reconciles with the persisted choice.
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("backend-theme");
    if (saved === "light" || saved === "dark") {
      // Defer out of the effect body — setState synchronously in an effect trips
      // react-hooks/set-state-in-effect. Initial render stays "dark" (matches
      // SSR), then reconciles to the persisted choice on the next microtask.
      const persisted = saved;
      queueMicrotask(() => setMode(persisted));
    }
  }, []);

  const toggle = useCallback(() => {
    setMode((m) => {
      const next: Mode = m === "dark" ? "light" : "dark";
      localStorage.setItem("backend-theme", next);
      return next;
    });
  }, []);

  return (
    <BackendThemeContext.Provider value={{ mode, toggle }}>
      <div
        className={cn(
          "theme-cyan flex min-h-screen bg-background text-foreground",
          mode === "dark" ? "dark" : "theme-light",
        )}
      >
        {children}
      </div>
    </BackendThemeContext.Provider>
  );
}

// Drop-in toggle for the backend topbars. Renders the icon from state (not a
// `dark:` utility) so it stays correct under the suppressed-dark light mode.
export function BackendThemeToggle() {
  const { mode, toggle } = useBackendTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={toggle}
    >
      {mode === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
