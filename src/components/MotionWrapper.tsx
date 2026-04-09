import { motion } from "framer-motion";
import { ReactNode } from "react";
import { fadeUp, staggerContainer } from "@/lib/motion";

interface MotionWrapperProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function MotionWrapper({ children, className }: MotionWrapperProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionStagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}
