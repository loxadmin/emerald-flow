import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Zap, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

import DisplayCards from "@/components/ui/display-cards";
import { Link2, CheckCircle, Terminal, Cpu } from "lucide-react";

interface LandingHeroProps {
  title: string | null;
  subtitle: string | null;
  metricsLoading: boolean;
  metrics: {
    advertisers: number;
    campaigns: number;
    events: number;
  };
  manual: boolean | null;
}

export default function LandingHero({ title, subtitle, manual }: LandingHeroProps) {
  const [index, setIndex] = useState(0);
  const words = ["Brand", "Business", "App", "Shop"];

  useEffect(() => {
    const id = setInterval(() => setIndex((p) => (p + 1) % words.length), 2800);
    return () => clearInterval(id);
  }, []);

  const simpleCards = [
    {
      icon: <Link2 className="size-4 text-emerald-600 dark:text-emerald-300" />,
      title: "1. Paste Link",
      description: "No code or SDK setup needed",
      date: "Instant promotion",
      iconClassName: "text-emerald-500",
      titleClassName: "text-emerald-600 dark:text-emerald-400",
      className: "[grid-area:stack] opacity-75 grayscale hover:-translate-y-10 hover:opacity-100 hover:grayscale-0",
      solid: true,
    },
    {
      icon: <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-300" />,
      title: "2. Fast Approval",
      description: "Approved manually in under 12h",
      date: "Reviewed by admins",
      iconClassName: "text-emerald-500",
      titleClassName: "text-emerald-600 dark:text-emerald-400",
      className: "[grid-area:stack] translate-x-12 translate-y-10 opacity-85 grayscale hover:-translate-y-1 hover:opacity-100 hover:grayscale-0",
      solid: true,
    },
    {
      icon: <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-300" />,
      title: "3. Pay for Results",
      description: "Escrow released on action only",
      date: "Zero risk protection",
      iconClassName: "text-emerald-500",
      titleClassName: "text-emerald-600 dark:text-emerald-400",
      className: "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10",
      solid: true,
    },
  ];

  const advancedCards = [
    {
      icon: <Terminal className="size-4 text-emerald-600 dark:text-emerald-300" />,
      title: "1. Drop Snippet",
      description: "Add loader script in 5 mins",
      date: "Quick integration",
      iconClassName: "text-emerald-500",
      titleClassName: "text-emerald-600 dark:text-emerald-400",
      className: "[grid-area:stack] opacity-75 grayscale hover:-translate-y-10 hover:opacity-100 hover:grayscale-0",
      solid: true,
    },
    {
      icon: <Cpu className="size-4 text-emerald-600 dark:text-emerald-300" />,
      title: "2. Domain Scan",
      description: "System verifies and auto-activates",
      date: "Deterministic check",
      iconClassName: "text-emerald-500",
      titleClassName: "text-emerald-600 dark:text-emerald-400",
      className: "[grid-area:stack] translate-x-12 translate-y-10 opacity-85 grayscale hover:-translate-y-1 hover:opacity-100 hover:grayscale-0",
      solid: true,
    },
    {
      icon: <Zap className="size-4 text-emerald-600 dark:text-emerald-300" />,
      title: "3. Auto Go-Live",
      description: "Conversion events fire instantly",
      date: "Near real-time tracking",
      iconClassName: "text-emerald-500",
      titleClassName: "text-emerald-600 dark:text-emerald-400",
      className: "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10",
      solid: true,
    },
  ];

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

          {/* Hero display redesign with DisplayCards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:col-span-6 lg:block animate-in fade-in zoom-in-95 duration-1000"
          >
            <div className="relative mx-auto w-full max-w-[620px] flex items-center justify-center min-h-[420px] py-10">
              <DisplayCards cards={manual === true ? simpleCards : advancedCards} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
