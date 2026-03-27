import React, { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

const Avatar = ({ delay }: { delay: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, x: -80, y: 20 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1, 1, 0.5],
        x: [-120, -120, 120, 120],
        y: [40, -60, -60, 40],
      }}
      transition={{
        duration: 4,
        delay: delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="absolute left-1/2 top-1/2 -ml-4 -mt-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_8px_16px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.8)] border border-primary/20 z-20"
    >
      <User className="h-5 w-5 text-primary" />
    </motion.div>
  );
};

const Basket = ({ label, isTarget = false }: { label: string; isTarget?: boolean }) => {
  return (
    <div className="flex flex-col items-center gap-4 relative z-0">
      <div className={cn(
        "w-24 h-18 md:w-32 md:h-24 rounded-[2rem] relative transition-all duration-500 clay-shadow flex items-center justify-center",
        isTarget ? "bg-emerald-500/20 border border-emerald-500/40" : "bg-white/5 border border-white/20"
      )}>
        {/* Inner glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-[2rem]" />

        {/* 3D Rim */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 md:w-20 h-3 md:h-4 bg-inherit border-inherit rounded-t-2xl" />

        {/* Shadow inside */}
        <div className="absolute inset-[2px] rounded-[1.8rem] border border-white/5 pointer-events-none" />
      </div>
      <span className="text-[9px] md:text-[10px] font-black tracking-[0.2em] text-foreground/50 uppercase text-center w-32">
        {label}
      </span>
    </div>
  );
};

const Character = () => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["20deg", "-20deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-20deg", "20deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative perspective-1000 z-10"
    >
      {/* Floating Shadow */}
      <motion.div
        animate={{
          scale: [1, 0.7, 1],
          opacity: [0.3, 0.15, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-32 h-6 bg-black/40 rounded-[100%] blur-xl"
      />

      {/* 3D Character Image */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        animate={{
          y: [0, -25, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative w-40 h-56 md:w-56 md:h-72 rounded-[3rem] md:rounded-[4rem] overflow-hidden border border-white/20 shadow-2xl clay-shadow"
      >
        <img
          src="/assets/character.jpeg"
          alt="3D Character"
          className="w-full h-full object-cover scale-110 brightness-110 contrast-105"
        />
        {/* Glossy Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
      </motion.div>
    </div>
  );
};

const MigrationAnimation = () => {
  const avatars = [0, 1, 2];

  return (
    <div className="relative flex min-h-[450px] md:min-h-[550px] w-full items-center justify-center overflow-hidden py-10">
      {/* Ambient background glow */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <div className="h-[500px] w-[500px] rounded-full bg-emerald-500/20 blur-[120px]" />
      </div>

      <div className="relative flex flex-col items-center gap-12 w-full max-w-4xl px-4">
        {/* The Character and Baskets */}
        <div className="relative flex items-center justify-center gap-6 md:gap-16 w-full pt-10">
          <Basket label="Competitor Brand" />
          <Character />
          <Basket label="Your Brand" isTarget />

          {/* Moving Avatars */}
          <div className="absolute inset-0 pointer-events-none">
            {avatars.map((id) => (
              <Avatar key={id} delay={id * 1.5} />
            ))}
          </div>
        </div>

        {/* Caption */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 px-8 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.1)] clay-shadow"
        >
          <p className="text-sm font-bold text-foreground/90 flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(var(--primary),0.5)]" />
            Migrating customers in real-time
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default MigrationAnimation;
