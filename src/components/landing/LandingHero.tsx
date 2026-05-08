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
            {/* Live status pill */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/80">
                Migrating customers in real-time
              </span>
            </div>

            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
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
                        className="col-start-1 row-start-1 text-emerald-400"
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

            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/65 sm:text-lg">
              {subtitle}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] hover:bg-emerald-500 transition-colors"
              >
                Start Free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/docs"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-3 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/10 transition-colors"
              >
                View API Docs
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
