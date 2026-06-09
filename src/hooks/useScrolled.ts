"use client";

import { useEffect, useState } from "react";

/**
 * Returns `true` once the window has scrolled past `threshold` pixels (default
 * 10). Used by the storefront header to add a shadow on scroll.
 */
export function useScrolled(threshold = 10): boolean {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > threshold);
    onScroll(); // sync initial state (e.g. when navigating to a scrolled page)
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return isScrolled;
}
