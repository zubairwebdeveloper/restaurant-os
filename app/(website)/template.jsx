"use client";

import { motion, useReducedMotion } from "motion/react";

export default function Template({ children }) {
  const reduce = useReducedMotion();
  if (reduce) return children;
  return (
    <motion.div initial={{ opacity: 0.35, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
