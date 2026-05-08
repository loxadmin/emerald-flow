import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck, Zap, LineChart } from "lucide-react";
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

export default function LandingHero({ title, subtitle }: LandingHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const words = ["Brand", "Business", "App", "Shop"];

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
    const id = setInterval(() => setIndex((p) => (p + 1) % words.length), 2800);
    return () => clearInterval(id);
  }, []);

  const renderTitle = () => {
    if (title?.includes("Your Brand")) {
      const before = title.split("Your Brand")[0];
      return (
        <>
          <span className="text-foreground">{before}Your{" "}</span>
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
    return <span className="text-foreground">{title}</span>;
  };

  const valueProps = [
    { icon: ShieldCheck, label: "Pay only for verified outcomes" },
    { icon: Zap, label: "Live in minutes, not weeks" },
    { icon: LineChart, label: "Realtime attribution, no fluff" },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-background">
      {/* Local backdrop sits ABOVE FluidCanvas so the hero is always crisp */}
      <div aria-hidden className="absolute inset-0 -z-[1] bg-background" />
      <div aria-hidden className="absolute inset-0 -z-[1]"
           style={{
             background:
               "radial-gradient(60% 50% at 80% 0%, hsl(var(--primary)/0.12), transparent 60%), radial-gradient(50% 40% at 0% 10%, hsl(var(--pastel-sky)), transparent 60%)",
           }} />
      <div aria-hidden className="absolute inset-0 -z-[1] bg-grid opacity-[0.25] [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />

      <div className="mx-auto max-w-7xl px-6 pb-24 pt-32 sm:px-10 lg:px-16 lg:pt-36">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
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

            <h1 className="display-xl mt-6 !text-foreground">
              {renderTitle()}
            </h1>

            <p className="lede mt-6 text-muted-foreground">
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

            {/* Value props strip — replaces fake metrics */}
            <ul className="mt-10 grid gap-3 border-t border-border pt-6 sm:grid-cols-3">
              {valueProps.map((v) => (
                <li key={v.label} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <v.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs leading-snug text-foreground/80">{v.label}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Hero video — clean cinematic frame, no chrome */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative lg:col-span-6"
          >
            <div className="relative hero-halo">
              <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.35),0_12px_40px_-12px_hsl(220_40%_10%/0.18)]">
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
                {/* Subtle live indicator overlaid on video */}
                <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white backdrop-blur">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Live attribution
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
