import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, DollarSign, Send, Play, TrendingUp, CheckCircle2 } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import MotionWrapper from "@/components/MotionWrapper";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import featureAnalytics from "@/assets/feature-analytics.jpg";
import featureBilling from "@/assets/feature-billing.jpg";

interface SiteContent {
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  is_visible: boolean;
}

interface Props {
  content: Record<string, SiteContent>;
  metrics: { advertisers: number; campaigns: number; events: number };
  metricsLoading: boolean;
  onContactSubmit: (e: React.FormEvent) => void;
  contactName: string; setContactName: (v: string) => void;
  contactEmail: string; setContactEmail: (v: string) => void;
  contactMessage: string; setContactMessage: (v: string) => void;
  contactSending: boolean;
}

export default function LandingVariant3({ content, onContactSubmit, contactName, setContactName, contactEmail, setContactEmail, contactMessage, setContactMessage, contactSending }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const words = ["Brand", "Business", "App", "Shop"];

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
    const interval = setInterval(() => setIndex((p) => (p + 1) % words.length), 3000);
    return () => clearInterval(interval);
  }, []);

  const s = (key: string) => content[key];
  const steps = (s("how_it_works")?.content || "").split(/\r?\n|\\n/).filter(Boolean);

  const features = [
    { icon: BarChart3, title: "Real-Time Analytics", desc: "Track every event as it happens" },
    { icon: DollarSign, title: "Milestone Billing", desc: "Pay only for real results" },
    { icon: Shield, title: "Fraud Detection", desc: "Built-in IP rate limiting" },
    { icon: Zap, title: "Simple API", desc: "Integrate in minutes" },
  ];

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
              className="relative mx-auto mb-14 overflow-hidden rounded-3xl border border-white/10 shadow-[0_20px_80px_rgba(34,197,94,0.15)]"
              style={{ width: "min(90vw, 640px)", aspectRatio: "16/9" }}
            >
              <video src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div whileHover={{ scale: 1.1 }} className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/20 cursor-pointer">
                  <Play className="h-6 w-6 text-white ml-0.5" fill="white" />
                </motion.div>
              </div>
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

      {/* FEATURES — Editorial collage with image + overlapping stat card */}
      {s("features")?.is_visible !== false && (
        <section className="relative z-10 py-24 md:py-32 px-6 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <MotionWrapper className="mb-16 md:mb-20 max-w-2xl">
              <p className="text-primary font-bold text-xs uppercase tracking-[0.2em] mb-3">Performance First</p>
              <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight leading-[1.05]">
                {s("features")?.title || "Better data, smarter growth"}
              </h2>
            </MotionWrapper>

            {/* Two large image collages */}
            <div className="space-y-24 md:space-y-32 mb-20">
              {/* Feature 1 — Real-Time Analytics */}
              <MotionWrapper>
                <div className="relative">
                  <div className="w-[82%] md:w-[70%] aspect-[3/4] md:aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border border-border">
                    <img src={featureAnalytics} alt="Real-time analytics dashboard" width={800} height={1067} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="absolute -bottom-8 right-0 md:right-4 w-64 md:w-72 bg-card p-6 rounded-3xl shadow-2xl border border-border"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest">Real-Time</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Real-Time Analytics</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Every click and conversion synced to your dashboard instantly.</p>
                  </motion.div>
                </div>
              </MotionWrapper>

              {/* Feature 2 — Milestone Billing */}
              <MotionWrapper>
                <div className="relative flex justify-end pt-8">
                  <div className="w-[82%] md:w-[70%] aspect-[3/4] md:aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border border-border">
                    <img src={featureBilling} alt="Milestone billing visual" width={800} height={1067} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="absolute -bottom-8 left-0 md:left-4 w-64 md:w-72 bg-card p-6 rounded-3xl shadow-2xl border border-border"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest">Verified</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Milestone Billing</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Zero upfront waste. You only pay when pre-defined goals are met.</p>
                  </motion.div>
                </div>
              </MotionWrapper>
            </div>

            {/* Compact feature row for Fraud + API */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Shield, title: "Fraud Detection", desc: "Built-in IP rate limiting and zero double-counting." },
                { icon: Zap, title: "Simple API", desc: "Integrate our lightweight tracking snippet in minutes." },
              ].map((f, i) => (
                <MotionWrapper key={f.title} delay={i * 0.1}>
                  <div className="bg-card border border-border p-6 rounded-3xl flex items-center gap-5 h-full">
                    <div className="w-14 h-14 shrink-0 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary">
                      <f.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-0.5">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-snug">{f.desc}</p>
                    </div>
                  </div>
                </MotionWrapper>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS — Dark band with staircase step cards */}
      {s("how_it_works")?.is_visible !== false && (
        <section className="relative z-10 py-24 md:py-32 px-6 sm:px-10 lg:px-16 bg-black text-white">
          <div className="mx-auto max-w-4xl">
            <MotionWrapper className="text-center mb-12 md:mb-16">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight">{s("how_it_works")?.title}</h2>
              <p className="mt-4 text-white/60 text-base md:text-lg max-w-2xl mx-auto">{s("how_it_works")?.subtitle}</p>
            </MotionWrapper>

            <div className="space-y-4 md:space-y-5 max-w-2xl mx-auto">
              {steps.map((step, i) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const stepTitle = parts[0];
                const desc = parts.slice(1).join(": ");
                const isLast = i === steps.length - 1;
                return (
                  <MotionWrapper key={i} delay={i * 0.1}>
                    <div
                      className={`relative overflow-hidden p-7 md:p-8 rounded-[2rem] border ${
                        isLast
                          ? "bg-primary border-primary shadow-2xl shadow-primary/30"
                          : "bg-white/[0.04] border-white/10"
                      }`}
                    >
                      <span className={`absolute -top-6 -right-2 text-7xl md:text-8xl font-black italic pointer-events-none select-none ${isLast ? "text-white/20" : "text-white/[0.06]"}`}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="relative z-10">
                        <h4 className={`text-xl md:text-2xl font-bold mb-2 ${isLast ? "text-primary-foreground" : "text-white"}`}>{stepTitle}</h4>
                        <p className={`text-sm md:text-base leading-relaxed pr-8 ${isLast ? "text-primary-foreground/85" : "text-white/60"}`}>{desc}</p>
                        {isLast && (
                          <div className="mt-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
                            <CheckCircle2 className="w-4 h-4" />
                            Start scaling
                          </div>
                        )}
                      </div>
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
