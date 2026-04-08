import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  title: string | null;
  subtitle: string | null;
}

export default function LandingVariant2({ title, subtitle }: Props) {
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
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent z-[1]" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-[1] h-64 bg-gradient-to-t from-background via-background/90 to-transparent" />

      {/* Split layout: text left, stats right */}
      <div className="relative z-10 flex min-h-screen items-center px-6 sm:px-10 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 w-full max-w-7xl mx-auto">
          <div className="flex flex-col justify-center">
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 mb-8">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Live Platform</span>
              </div>
              <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {title?.includes("Your Brand") ? (
                  <>
                    {title.split("Your Brand")[0]}Your{" "}
                    <AnimatePresence mode="wait">
                      <motion.span key={words[index]} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.5 }} className="text-[#22c55e]">
                        {words[index]}
                      </motion.span>
                    </AnimatePresence>
                  </>
                ) : title}
              </h1>
              <p className="mt-6 max-w-md text-base text-white/50 leading-relaxed">{subtitle}</p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link to="/signup">
                  <GlassButton size="lg" variant="glow" className="px-10">Start Free <ArrowRight className="h-4 w-4" /></GlassButton>
                </Link>
                <Link to="/docs">
                  <GlassButton size="lg" variant="outline" className="border-white/30 bg-white/5 px-10 backdrop-blur-md hover:bg-white/10">
                    <span className="text-white font-bold">View API Docs</span>
                  </GlassButton>
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Right side: floating cards */}
          <div className="hidden lg:flex flex-col justify-center gap-6">
            {[
              { icon: BarChart3, label: "Real-Time Analytics", value: "Track every event" },
              { icon: Shield, label: "Fraud Detection", value: "Built-in protection" },
              { icon: Zap, label: "Simple API", value: "Integrate in minutes" },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.15 }}
                className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <card.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-white">{card.label}</p>
                  <p className="text-sm text-white/40">{card.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
