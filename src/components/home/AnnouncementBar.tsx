"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const MESSAGES = [
  "Free shipping over ₹999",
  "Extra 10% off your first order",
  "24/7 customer support",
];

const ROTATE_MS = 4000;

// Thin promo strip above the header. Rotates messages with a fade; dismissible
// for the session only (in-memory state — intentionally NOT persisted).
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
    <div className="relative bg-primary text-primary-foreground">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center px-10 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center text-xs font-medium tracking-wide sm:text-sm"
          >
            {MESSAGES[index]}
          </motion.p>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-primary-foreground/80 transition-colors duration-300 hover:bg-white/15 hover:text-primary-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
