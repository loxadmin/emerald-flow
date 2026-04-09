import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence } from "framer-motion";

interface LandingHeroProps {
  title: string | null;
  subtitle: string | null;
  metricsLoading: boolean;
  metrics: {
    advertisers: number;
    campaigns: number;
    events: number;
  };
}

export default function LandingHero({ title, subtitle }: LandingHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const words = ["Brand", "Business", "App", "Shop"];

  useEffect(() => {
    videoRef.current?.play().catch(() => {});

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative z-0 overflow-hidden">
      {/* Video background — full bleed, sits behind transparent navbar */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          src="/hero-animation.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
        />
        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 bg-black/60 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 z-[2]" />
      </div>

      {/* Bottom seamless fade into page background */}
      <div className="absolute bottom-0 left-0 right-0 z-[1] h-64 bg-gradient-to-t from-background via-background/90 to-transparent" />

      {/* Content — left-aligned like wan.video */}
      <div className="relative z-10 flex min-h-screen items-end px-6 pb-32 pt-32 sm:px-10 lg:px-16">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {title?.includes("Your Brand") ? (
                <>
                  {title.split("Your Brand")[0]}Your{" "}
                  <span className="inline-grid">
                    <span className="invisible pointer-events-none col-start-1 row-start-1">Business</span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={words[index]}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="col-start-1 row-start-1 text-[#22c55e]"
                      >
                        {words[index]}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </>
              ) : (
                title
              )}
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/60 sm:text-lg">
              {subtitle}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/signup">
                <GlassButton size="lg" variant="glow" className="px-10">
                  Start Free <ArrowRight className="h-4 w-4" />
                </GlassButton>
              </Link>
              <Link to="/docs">
                <GlassButton
                  size="lg"
                  variant="outline"
                  className="border-white/40 bg-white/10 px-10 backdrop-blur-md hover:bg-white/20 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] group"
                >
                  <span className="text-white font-bold drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] group-hover:drop-shadow-[0_4px_16px_rgba(0,0,0,1)] transition-all duration-300">
                    View API Docs
                  </span>
                </GlassButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
