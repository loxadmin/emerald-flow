import { motion } from "framer-motion";
import { ReactNode } from "react";

export function SuccessMotion({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function ErrorMotion({ children }: { children: ReactNode }) {
  return (
    <motion.div
      animate={{ x: [-5, 5, -5, 5, 0] }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}
