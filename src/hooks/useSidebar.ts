"use client";

import { create } from "zustand";

// Admin sidebar UI state. Collapse state is kept in memory (Zustand) only — it
// is intentionally NOT persisted to localStorage, so it resets per session.
interface SidebarState {
  isCollapsed: boolean; // desktop icon-only mode
  isMobileOpen: boolean; // mobile Sheet drawer open
  toggleCollapse: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}

export const useSidebar = create<SidebarState>((set) => ({
  isCollapsed: false,
  isMobileOpen: false,
  toggleCollapse: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
  openMobile: () => set({ isMobileOpen: true }),
  closeMobile: () => set({ isMobileOpen: false }),
}));
