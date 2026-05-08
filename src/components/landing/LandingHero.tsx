import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function LandingHero({ title, subtitle, metrics, metricsLoading }: LandingHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const words = ["Brand", "Business", "App", "Shop"];

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
    const id = setInterval(() => setIndex((p) => (p + 1) % words.length), 2800);
    return () => clearInterval(id);
  }, []);

  // Strip leading "Your Brand" prefix for split rendering
  const renderTitle = () => {
    if (title?.includes("Your Brand")) {
      const before = title.split("Your Brand")[0];
      return (
        <>
          {before}Your{" "}
          <span className="inline-grid align-baseline">
            <span className="invisible pointer-events-none col-start-1 row-start-1">Business</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={words[index]}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="col-start-1 row-start-1 text-primary"
              >
                {words[index]}
              </motion.span>
            </AnimatePresence>
          </span>
        </>
      );
    }
    return title;
  };

  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+` : `${n}+`);

  return (
    <section className="relative isolate overflow-hidden bg-background">
      {/* Soft ambient backdrop — calm fintech */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[640px]"
             style={{
               background:
                 "radial-gradient(60% 50% at 80% 0%, hsl(var(--primary)/0.10), transparent 60%), radial-gradient(50% 40% at 10% 10%, hsl(var(--pastel-sky)), transparent 60%)",
             }} />
        <div className="absolute inset-0 bg-grid opacity-[0.35] [mask-image:radial-gradient(60%_50%_at_50%_30%,black,transparent)]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-24 pt-32 sm:px-10 lg:px-16 lg:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6"
          >
            <span className="pill-emerald">
              <Sparkles className="h-3.5 w-3.5" />
              Performance attribution, simplified
            </span>

            <h1 className="display-xl mt-6 text-foreground">
              {renderTitle()}
            </h1>

            <p className="lede mt-6">
              {subtitle}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/signup">
                <Button size="lg" className="h-12 rounded-full px-7 text-sm font-semibold shadow-sm">
                  Start free <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/docs">
                <Button size="lg" variant="outline" className="h-12 rounded-full border-border bg-card px-7 text-sm font-semibold hover:bg-secondary">
                  View API docs
                </Button>
              </Link>
            </div>

            {/* Trust strip */}
            <div className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
              {[
                { v: metrics.advertisers, l: "Advertisers" },
                { v: metrics.campaigns, l: "Campaigns" },
                { v: metrics.events, l: "Tracked events" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="stat-number !text-2xl">
                    {metricsLoading ? "—" : fmt(s.v)}
                  </div>
                  <div className="eyebrow mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Hero video — floating fintech panel */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative lg:col-span-6"
          >
            <div className="relative hero-halo">
              <div className="hero-frame relative">
                {/* Faux window chrome */}
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    karbali · live
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                    realtime
                  </span>
                </div>

                <div className="aspect-[16/10] w-full bg-secondary">
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
                </div>
              </div>

              {/* Floating metric chip */}
              <div className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-md sm:block">
                <div className="eyebrow">Today</div>
                <div className="mt-0.5 stat-number !text-xl">+24.8%</div>
                <div className="text-[11px] text-muted-foreground">verified conversions</div>
              </div>
              <div className="absolute -right-4 -top-5 hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-md sm:block">
                <div className="eyebrow">Spend</div>
                <div className="mt-0.5 stat-number !text-xl">$12,480</div>
                <div className="text-[11px] text-muted-foreground">across 14 campaigns</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
