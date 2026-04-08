import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Activity } from "lucide-react";
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
  const words = ["Brand", "Business", "Shop"];

  useEffect(() => {
    videoRef.current?.play().catch(() => {});

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const displayTitle = title || "Migrate Customers to Your Brand";
  const baseTitle = displayTitle.replace("Brand", "").trim();

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
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
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
              {baseTitle}{" "}
              <span className="relative inline-block min-w-[3.5rem] sm:min-w-[4.5rem] md:min-w-[6rem] lg:min-w-[8rem]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={words[index]}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute left-0 inline-block text-primary"
                  >
                    {words[index]}
                  </motion.span>
                </AnimatePresence>
              </span>
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
                  className="border-white/20 bg-white/5 px-10 text-white backdrop-blur-sm hover:bg-white/10"
                >
                  View API Docs
                </GlassButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
