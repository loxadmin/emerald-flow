import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  title: string | null;
  subtitle: string | null;
}

export default function LandingVariant1({ title, subtitle }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const words = ["Brand", "Business", "Shop"];

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
    const interval = setInterval(() => setIndex((p) => (p + 1) % words.length), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative z-0 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/60 z-[1]" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-[1] h-64 bg-gradient-to-t from-background via-background/90 to-transparent" />

      {/* Center-aligned hero with large typography */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-4xl">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
            <p className="mb-6 text-sm uppercase tracking-[0.3em] text-emerald-400 font-bold">Performance Attribution Platform</p>
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
              {title?.includes("Your Brand") ? (
                <>
                  {title.split("Your Brand")[0]}Your{" "}
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={words[index]}
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -40, opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="text-[#22c55e]"
                    >
                      {words[index]}
                    </motion.span>
                  </AnimatePresence>
                </>
              ) : title}
            </h1>
            <p className="mt-8 mx-auto max-w-xl text-lg text-white/50">{subtitle}</p>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
              <Link to="/signup">
                <GlassButton size="lg" variant="glow" className="px-12 h-14 text-lg">
                  Start Free <ArrowRight className="h-5 w-5" />
                </GlassButton>
              </Link>
              <Link to="/docs">
                <GlassButton size="lg" variant="outline" className="border-white/30 bg-white/5 px-12 h-14 text-lg backdrop-blur-md hover:bg-white/10">
                  <span className="text-white font-bold">View API Docs</span>
                </GlassButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
