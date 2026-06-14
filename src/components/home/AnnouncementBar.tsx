"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";

const MESSAGES = [
  "Free shipping on orders over ₹999",
  "Extra 10% off your first order",
  "24/7 customer support",
];

const ROTATE_MS = 4000;

// Thin promo strip above the header. A subtle teal gradient (not flat) with a
// leading sparkle, fade-rotating messages, and a clean dismiss. Dismissed for
// the session only (in-memory state — intentionally NOT persisted).
export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % MESSAGES.length),
      ROTATE_MS
    );
    return () => clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#023047] via-[#219EBC] to-[#023047] text-white">
      {/* faint sheen for a touch of depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"
      />

      <div className="relative mx-auto flex h-8 max-w-7xl items-center justify-center gap-2 px-10 sm:px-6 lg:px-8">
        <Sparkles className="hidden size-3.5 shrink-0 opacity-80 sm:block" aria-hidden />
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center text-xs font-medium tracking-wide"
          >
            {MESSAGES[index]}
          </motion.p>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 text-primary-foreground/80 transition-all duration-300 hover:bg-white/15 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
