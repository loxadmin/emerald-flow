import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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

export default function LandingHero({ title, subtitle, metrics }: LandingHeroProps) {
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
      {/* Video background */}
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
        <div className="absolute inset-0 bg-black/65 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/30 to-black/90 z-[2]" />
      </div>

      {/* Bottom seamless fade into page background */}
      <div className="absolute bottom-0 left-0 right-0 z-[1] h-72 bg-gradient-to-t from-background via-background/95 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex min-h-[92vh] items-center px-6 pb-32 pt-32 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Eyebrow */}
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/80">
                  Performance attribution. Verified.
                </span>
              </div>

              <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] text-white sm:text-[56px] md:text-[68px] lg:text-[76px]">
                {title?.includes("Your Brand") ? (
                  <>
                    {title.split("Your Brand")[0]}Your{" "}
                    <span className="inline-grid">
                      <span className="invisible pointer-events-none col-start-1 row-start-1">Business</span>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={words[index]}
                          initial={{ y: 18, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -18, opacity: 0 }}
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

              <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-white/65 sm:text-[17px]">
                {subtitle}
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link to="/signup" className="btn-pill px-7 py-3 text-[14px] font-semibold">
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/docs"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/[0.04] px-7 py-3 text-[14px] font-medium text-white backdrop-blur-md transition-all hover:bg-white/10"
                >
                  View API docs
                </Link>
              </div>

              {/* Inline metric strip */}
              <div className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-4 text-white/60">
                {[
                  { label: "Advertisers", value: metrics.advertisers },
                  { label: "Campaigns", value: metrics.campaigns },
                  { label: "Events tracked", value: metrics.events },
                ].map((m) => (
                  <div key={m.label} className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                      {m.label}
                    </span>
                    <span className="mt-1 font-mono text-xl font-semibold tabular-nums text-white">
                      {m.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
