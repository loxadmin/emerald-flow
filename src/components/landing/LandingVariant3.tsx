import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, DollarSign, Send, Play } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import MotionWrapper from "@/components/MotionWrapper";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SiteContent {
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  is_visible: boolean;
}

import DisplayCards from "@/components/ui/display-cards";
import { Link2, CheckCircle, Terminal, Cpu, ShieldCheck } from "lucide-react";

interface Props {
  content: Record<string, SiteContent>;
  metrics: { advertisers: number; campaigns: number; events: number };
  metricsLoading: boolean;
  onContactSubmit: (e: React.FormEvent) => void;
  contactName: string; setContactName: (v: string) => void;
  contactEmail: string; setContactEmail: (v: string) => void;
  contactMessage: string; setContactMessage: (v: string) => void;
  contactSending: boolean;
  manual: boolean | null;
}

export default function LandingVariant3({ content, onContactSubmit, contactName, setContactName, contactEmail, setContactEmail, contactMessage, setContactMessage, contactSending, manual }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const words = ["Brand", "Business", "App", "Shop"];

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

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
    const interval = setInterval(() => setIndex((p) => (p + 1) % words.length), 3000);
    return () => clearInterval(interval);
  }, []);

  const s = (key: string) => content[key];

  const defaultFeatures = [
    { icon: BarChart3, title: "Real-Time Analytics", desc: "Track every event as it happens" },
    { icon: DollarSign, title: "Milestone Billing", desc: "Pay only for real results" },
    { icon: Shield, title: "Fraud Detection", desc: "Built-in IP rate limiting" },
    { icon: Zap, title: "Simple API", desc: "Integrate in minutes" },
  ];

  const simpleFeatures = [
    { icon: BarChart3, title: "Verified Analytics", desc: "Manual checks against your store consoles daily" },
    { icon: DollarSign, title: "Milestone Billing", desc: "Pay only for real results" },
    { icon: Shield, title: "Escrow Protection", desc: "Funds held in secure escrow" },
    { icon: Zap, title: "Handled For You", desc: "Submit link. No code needed" },
  ];

  const features = manual === true ? simpleFeatures : defaultFeatures;

  const defaultSteps = [
    "1. Create a Campaign: Set your budget and define what you will pay for.",
    "2. Integrate Our API: Add a simple tracking snippet to your app.",
    "3. Get Approved: Our admin team verifies your integration and activates your campaign.",
    "4. Track and Pay for Results: Monitor real-time analytics and only pay when users take action."
  ];

  const simpleSteps = [
    "1. Create a Campaign: Paste your app, website, song or video link and set your budget.",
    "2. Submit for Approval: A Karbali official reviews your destination and approves your campaign.",
    "3. We Track Progress: The review team tracks outcomes daily against your source-of-truth dashboard.",
    "4. Pay Only for Results: Escrow is released only as validated outcomes are confirmed."
  ];

  const steps = manual === true ? simpleSteps : ((s("how_it_works")?.content || "").split(/\r?\n|\\n/).filter(Boolean).length > 0 ? (s("how_it_works")?.content || "").split(/\r?\n|\\n/).filter(Boolean) : defaultSteps);

  return (
    <>
      {/* HERO — Apple-style centered with floating video window */}
      <section className="relative z-0 overflow-hidden bg-black min-h-screen flex flex-col items-center justify-center">
        <div className="absolute inset-0 z-0">
          <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover opacity-20" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-[3] h-80 bg-gradient-to-t from-background via-background/95 to-transparent" />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.2, delay: 0.2 }}
              className="relative mx-auto mb-14 overflow-hidden py-10 flex items-center justify-center"
              style={{ width: "min(90vw, 640px)" }}
            >
              <DisplayCards cards={manual === true ? simpleCards : advancedCards} />
            </motion.div>

            <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {s("hero")?.title?.includes("Your Brand") ? (
                <>
                  {s("hero").title!.split("Your Brand")[0]}Your{" "}
                  <AnimatePresence mode="wait">
                    <motion.span key={words[index]} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }} transition={{ duration: 0.5 }} className="text-primary">
                      {words[index]}
                    </motion.span>
                  </AnimatePresence>
                </>
              ) : s("hero")?.title}
            </h1>
            <p className="mt-8 mx-auto max-w-xl text-lg text-white/40 leading-relaxed">{s("hero")?.subtitle}</p>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
              <Link to="/signup">
                <GlassButton size="lg" variant="glow" className="px-12 h-14 text-base">Start Free <ArrowRight className="h-4 w-4" /></GlassButton>
              </Link>
              <Link to="/docs">
                <GlassButton size="lg" variant="outline" className="border-white/30 bg-white/5 px-12 h-14 backdrop-blur-md hover:bg-white/10">
                  <span className="text-white font-bold">View API Docs</span>
                </GlassButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES — Horizontal divider layout */}
      {s("features")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <MotionWrapper className="text-center mb-24">
              <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">{s("features")?.title}</h2>
            </MotionWrapper>

            <div className="divide-y divide-border/50">
              {features.map((f, i) => (
                <MotionWrapper key={f.title} delay={i * 0.1}>
                  <motion.div whileHover={{ x: 12 }} transition={{ duration: 0.3 }} className="group flex items-center gap-8 py-10 cursor-default">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                      <f.icon className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-foreground mb-1">{f.title}</h3>
                      <p className="text-muted-foreground">{f.desc}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-2 transition-all duration-300" />
                  </motion.div>
                </MotionWrapper>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS — Minimal numbered with connecting line */}
      {s("how_it_works")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 lg:px-16 bg-muted/20">
          <div className="mx-auto max-w-4xl">
            <MotionWrapper className="text-center mb-20">
              <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">{s("how_it_works")?.title}</h2>
              <p className="mt-6 text-muted-foreground text-lg max-w-2xl mx-auto">{s("how_it_works")?.subtitle}</p>
            </MotionWrapper>

            <div className="relative ml-8 md:ml-12">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-primary/30 to-transparent" />

              {steps.map((step, i) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const stepTitle = parts[0];
                const desc = parts.slice(1).join(": ");

                return (
                  <MotionWrapper key={i} delay={i * 0.15}>
                    <div className="relative pl-12 pb-16 last:pb-0">
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.15 + 0.3 }}
                        className="absolute -left-3 top-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
                      >
                        <span className="text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                      </motion.div>
                      <h3 className="text-xl font-bold text-foreground mb-2">{stepTitle}</h3>
                      <p className="text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </MotionWrapper>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative z-10 py-32 px-6">
        <MotionWrapper className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight mb-6">Start today</h2>
          <p className="text-muted-foreground text-lg mb-12">No setup fees. Pay only for real results.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup">
              <GlassButton size="lg" variant="glow" className="px-14 h-16 text-lg">Get Started <ArrowRight className="h-5 w-5 ml-2" /></GlassButton>
            </Link>
            <Link to="/docs">
              <GlassButton size="lg" variant="outline" className="px-14 h-16 text-lg border-border">API Docs</GlassButton>
            </Link>
          </div>
        </MotionWrapper>
      </section>

      {/* CONTACT */}
      {s("contact")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 bg-muted/20">
          <div className="mx-auto max-w-2xl text-center">
            <MotionWrapper className="mb-14">
              <h2 className="text-4xl font-black text-foreground">{s("contact")?.title}</h2>
              <p className="mt-4 text-muted-foreground text-lg">{s("contact")?.subtitle}</p>
            </MotionWrapper>
            <MotionWrapper delay={0.2}>
              <form onSubmit={onContactSubmit} className="space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-foreground">Name</Label>
                    <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Your name" maxLength={100} required className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-foreground">Email</Label>
                    <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@company.com" maxLength={255} required className="h-12 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Message</Label>
                  <Textarea value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="Your message..." maxLength={2000} required rows={5} className="rounded-xl resize-none" />
                </div>
                <GlassButton type="submit" variant="glow" className="w-full h-12 rounded-xl" disabled={contactSending}>
                  {contactSending ? "Sending..." : <span className="flex items-center justify-center gap-2">Send <Send className="h-4 w-4" /></span>}
                </GlassButton>
              </form>
            </MotionWrapper>
          </div>
        </section>
      )}

      {/* FOOTER */}
      {s("footer")?.is_visible !== false && (
        <Footer content={s("footer")?.content} />
      )}
    </>
  );
}
