import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "lucide-react";

const Avatar = ({ id, delay }: { id: number; delay: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, x: -80, y: 20 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1, 1, 0.5],
        x: [-80, -80, 80, 80],
        y: [20, -40, -40, 20],
      }}
      transition={{
        duration: 4,
        delay: delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="absolute left-1/2 top-1/2 -ml-4 -mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg border border-primary/20"
    >
      <User className="h-4 w-4 text-primary" />
    </motion.div>
  );
};

const Basket = ({ position }: { position: "left" | "right" }) => {
  return (
    <div
      className={`relative h-24 w-32 ${
        position === "left" ? "-translate-x-20" : "translate-x-20"
      }`}
    >
      {/* Back of basket */}
      <div className="absolute inset-0 rounded-b-3xl rounded-t-xl bg-primary/20 backdrop-blur-sm border border-primary/30 shadow-inner" />

      {/* 3D Rim */}
      <div className="absolute -top-2 left-0 right-0 h-6 rounded-full border-4 border-primary/40 bg-primary/10 shadow-lg" />

      {/* Front of basket (transparent to see avatars) */}
      <div className="absolute inset-0 rounded-b-3xl rounded-t-xl bg-gradient-to-t from-primary/10 to-transparent border-x border-b border-primary/20" />

      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
        {position === "left" ? "Old Brand" : "Your Brand"}
      </div>
    </div>
  );
};

const Character = () => {
  return (
    <div className="relative flex flex-col items-center">
      {/* Head */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="h-14 w-14 rounded-full bg-[#E5E7EB] shadow-[inset_-4px_-4px_8px_rgba(0,0,0,0.1),inset_4px_4px_8px_rgba(255,255,255,0.8)] border border-white/50"
      />

      {/* Body */}
      <motion.div
        animate={{ scaleY: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="mt-1 h-24 w-20 rounded-[2rem] bg-[#F3F4F6] shadow-[inset_-6px_-6px_12px_rgba(0,0,0,0.15),inset_6px_6px_12px_rgba(255,255,255,0.9)] border border-white/60"
      />

      {/* Arms */}
      <div className="absolute top-16 flex w-48 justify-between px-2">
        {/* Left Arm */}
        <motion.div
          animate={{
            rotate: [0, -20, 0],
            y: [0, -10, 0],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="h-4 w-16 origin-right rounded-full bg-[#E5E7EB] shadow-md border border-white/40"
        />
        {/* Right Arm */}
        <motion.div
          animate={{
            rotate: [0, 20, 0],
            y: [0, -10, 0],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="h-4 w-16 origin-left rounded-full bg-[#E5E7EB] shadow-md border border-white/40"
        />
      </div>
    </div>
  );
};

const MigrationAnimation = () => {
  const [avatars, setAvatars] = useState([0, 1, 2]);

  return (
    <div className="relative flex min-h-[400px] w-full items-center justify-center overflow-hidden py-10">
      {/* Ambient background glow */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
        <div className="h-[300px] w-[300px] rounded-full bg-primary/20 blur-[100px]" />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* The Character and Baskets */}
        <div className="relative flex items-center justify-center pt-10">
          <Basket position="left" />
          <Character />
          <Basket position="right" />

          {/* Moving Avatars */}
          <div className="absolute inset-0 pointer-events-none">
            {avatars.map((id) => (
              <Avatar key={id} id={id} delay={id * 1.5} />
            ))}
          </div>
        </div>

        {/* Caption */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 px-6 py-3 shadow-xl"
        >
          <p className="text-sm font-medium text-foreground/80 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            Migrating customers in real-time
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default MigrationAnimation;
