"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export function AnimatedContainer({ children, className }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function AnimatedFade({ children, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedScaleProps extends Props {
  delay?: number;
}

export function AnimatedScale({ children, className, delay = 0 }: AnimatedScaleProps) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
} 