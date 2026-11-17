"use client";

import { motion, useReducedMotion } from "motion/react";

/** Fade + rise on mount. `delay` in seconds for simple staggering. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Horizontal bar that grows to `value` (0–1). */
export function Bar({ value, className = "bg-accent", delay = 0 }: { value: number; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const pct = `${Math.max(0, Math.min(1, value)) * 100}%`;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <motion.div
        className={`h-full rounded-full ${className}`}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: pct }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
