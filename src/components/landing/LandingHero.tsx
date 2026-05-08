import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Zap, LineChart } from "lucide-react";
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
      <div aria-hidden className="absolute inset-0 -z-[1] bg-background" />
      <div aria-hidden className="absolute inset-0 -z-[1]"
           style={{
             background:
               "radial-gradient(60% 50% at 80% 0%, hsl(var(--primary)/0.12), transparent 60%), radial-gradient(50% 40% at 0% 10%, hsl(var(--pastel-sky)), transparent 60%)",
           }} />
      <div aria-hidden className="absolute inset-0 -z-[1] bg-grid opacity-[0.25] [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />

      <div className="mx-auto max-w-7xl px-6 pb-24 pt-32 sm:px-10 lg:px-16 lg:pt-36">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6"
          >
            <h1 className="display-xl !text-foreground">
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

          {/* Hero video — futuristic blended composition */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative lg:col-span-6"
          >
            <div aria-hidden className="pointer-events-none absolute -inset-16"
                 style={{
                   background:
                     "radial-gradient(50% 50% at 50% 50%, hsl(var(--primary)/0.28), transparent 65%), radial-gradient(40% 40% at 80% 20%, hsl(var(--pastel-sky)/0.6), transparent 70%)",
                   filter: "blur(40px)",
                 }} />
            <div aria-hidden className="pointer-events-none absolute inset-0 -m-6 rounded-[3rem] opacity-60"
                 style={{
                   background:
                     "conic-gradient(from 140deg at 50% 50%, transparent 0deg, hsl(var(--primary)/0.35) 60deg, transparent 140deg, hsl(var(--pastel-lavender)/0.5) 220deg, transparent 320deg)",
                   filter: "blur(28px)",
                 }} />

            <div className="relative mx-auto aspect-[5/4] w-full max-w-[620px]">
              {/* Soft outer aura that bleeds into hero bg */}
              <div aria-hidden className="pointer-events-none absolute inset-[-22%] rounded-[3rem]"
                   style={{
                     background:
                       "radial-gradient(closest-side, hsl(var(--primary)/0.35), hsl(var(--pastel-sky)/0.3) 45%, transparent 75%)",
                     filter: "blur(48px)",
                   }} />

              {/* Pulsating ringing rings — spectrum effect */}
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  aria-hidden
                  className="pointer-events-none absolute inset-[-4%] rounded-[2.25rem] border border-primary/30"
                  style={{
                    animation: `ringPulse 3.2s cubic-bezier(0.22,1,0.36,1) ${i * 1.05}s infinite`,
                  }}
                />
              ))}

              {/* Video frame with strong gradient feather to blend into hero */}
              <div
                className="absolute inset-0 overflow-hidden rounded-[2rem]"
                style={{
                  WebkitMaskImage:
                    "radial-gradient(120% 110% at 50% 50%, black 35%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.35) 82%, transparent 100%)",
                  maskImage:
                    "radial-gradient(120% 110% at 50% 50%, black 35%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.35) 82%, transparent 100%)",
                }}
              >
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

                {/* Dark overlay for cinematic depth */}
                <div aria-hidden className="absolute inset-0"
                     style={{
                       background:
                         "linear-gradient(180deg, hsl(220 25% 6% / 0.55) 0%, hsl(220 25% 6% / 0.25) 35%, hsl(220 25% 6% / 0.35) 65%, hsl(220 25% 6% / 0.7) 100%)",
                     }} />

                {/* Color grade tint */}
                <div aria-hidden className="absolute inset-0 mix-blend-soft-light"
                     style={{
                       background:
                         "radial-gradient(circle at 30% 30%, hsl(var(--primary)/0.4), transparent 55%), radial-gradient(circle at 70% 75%, hsl(var(--pastel-lavender)/0.4), transparent 60%)",
                     }} />

                {/* Edge feather toward hero bg color */}
                <div aria-hidden className="absolute inset-0"
                     style={{
                       background:
                         "radial-gradient(130% 110% at 50% 50%, transparent 55%, hsl(var(--background)/0.55) 82%, hsl(var(--background)) 100%)",
                     }} />

                {/* Spectrum scan shimmer */}
                <div aria-hidden className="absolute inset-0 opacity-[0.12]"
                     style={{
                       backgroundImage:
                         "repeating-linear-gradient(180deg, hsl(var(--foreground)) 0 1px, transparent 1px 3px)",
                     }} />
              </div>

              {/* Inner accent rings */}
              <div aria-hidden className="pointer-events-none absolute inset-[6%] rounded-[1.5rem] border border-primary/15" />
              <div aria-hidden className="pointer-events-none absolute inset-[12%] rounded-[1.25rem] border border-foreground/5" />

              <style>{`
                @keyframes ringPulse {
                  0% { transform: scale(0.92); opacity: 0; border-color: hsl(var(--primary) / 0.55); }
                  20% { opacity: 0.9; }
                  100% { transform: scale(1.18); opacity: 0; border-color: hsl(var(--pastel-sky) / 0.2); }
                }
              `}</style>


              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="absolute -left-2 top-10 hidden rounded-2xl border border-border/60 bg-card/80 px-3.5 py-2.5 shadow-xl backdrop-blur-xl sm:block"
              >
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Attribution</div>
                    <div className="text-xs font-semibold text-foreground">Live · realtime</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="absolute -right-2 bottom-10 hidden rounded-2xl border border-border/60 bg-card/80 px-3.5 py-2.5 shadow-xl backdrop-blur-xl sm:block"
              >
                <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">ROAS today</div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-base font-semibold text-foreground">4.82×</span>
                  <span className="text-[10px] font-medium text-emerald-500">+12.4%</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
