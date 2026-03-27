import React, { useState } from "react";
import { motion } from "framer-motion";
import { User } from "lucide-react";

const Avatar = ({ id, delay }: { id: number; delay: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, x: -96, y: 20 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1, 1, 0.5],
        x: [-96, -96, 96, 96],
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

const Basket = ({ position, label }: { position: "left" | "right"; label: string }) => {
  return (
    <div
      className={`relative h-24 w-32 ${
        position === "left" ? "-translate-x-24" : "translate-x-24"
      }`}
    >
      {/* Back of basket */}
      <div className="absolute inset-0 rounded-b-3xl rounded-t-xl bg-primary/20 backdrop-blur-sm border border-primary/30 shadow-inner" />

      {/* 3D Rim */}
      <div className="absolute -top-2 left-0 right-0 h-6 rounded-full border-4 border-primary/40 bg-primary/10 shadow-lg" />

      {/* Front of basket (transparent to see avatars) */}
      <div className="absolute inset-0 rounded-b-3xl rounded-t-xl bg-gradient-to-t from-primary/10 to-transparent border-x border-b border-primary/20" />

      <div className="absolute -bottom-8 left-0 right-0 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/60 whitespace-nowrap">
        {label}
      </div>
    </div>
  );
};

const Character = () => {
  return (
    <div className="relative z-20 flex flex-col items-center">
      <motion.div
        animate={{
          y: [0, -12, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        <img
          src="/assets/3d-character.png"
          alt="Character"
          className="h-48 w-auto object-contain drop-shadow-2xl"
        />
        {/* Dynamic Shadow */}
        <motion.div
          animate={{
            scale: [1, 0.8, 1],
            opacity: [0.3, 0.15, 0.3]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 h-4 w-24 bg-black/20 blur-xl rounded-full"
        />
      </motion.div>
    </div>
  );
};

const MigrationAnimation = () => {
  const [avatars] = useState([0, 1, 2]);

  return (
    <div className="relative flex min-h-[420px] w-full items-center justify-center overflow-hidden py-10" data-testid="animation-container">
      {/* Ambient background glow */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
        <div className="h-[300px] w-[300px] rounded-full bg-primary/20 blur-[100px]" />
      </div>

      <div className="relative flex flex-col items-center gap-10">
        {/* The Character and Baskets */}
        <div className="relative flex items-center justify-center pt-10">
          <Basket position="left" label="Metamask" />
          <Character />
          <Basket position="right" label="Secure Wallet" />

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
