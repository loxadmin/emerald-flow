import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  title: string | null;
  subtitle: string | null;
}

export default function LandingVariant4({ title, subtitle }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const words = ["Brand", "Business", "Shop"];

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
    const interval = setInterval(() => setIndex((p) => (p + 1) % words.length), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative z-0 overflow-hidden bg-black">
      {/* Diagonal split: video on right half */}
      <div className="absolute inset-0 z-0">
        <div className="absolute right-0 top-0 h-full w-full lg:w-[60%]" style={{ clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0% 100%)" }}>
          <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-[1] h-64 bg-gradient-to-t from-background via-background/90 to-transparent" />

      <div className="relative z-10 flex min-h-screen items-center px-6 sm:px-10 lg:px-20">
        <div className="max-w-xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
            <div className="mb-8 h-1 w-16 bg-primary rounded-full" />
            <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-7xl">
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

            {/* Minimal stats row */}
            <div className="mt-16 flex gap-12">
              {[
                { label: "Uptime", value: "99.9%" },
                { label: "Events Tracked", value: "10M+" },
                { label: "Avg Integration", value: "5 min" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                  <p className="text-xs text-white/30 uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
