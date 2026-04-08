import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, DollarSign, Send, CheckCircle2, Mail, MapPin, Globe, Terminal } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence } from "framer-motion";
import MotionWrapper, { MotionItem } from "@/components/MotionWrapper";
import Logo from "@/components/Logo";
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

export default function LandingVariant1({ content, metrics, metricsLoading, onContactSubmit, contactName, setContactName, contactEmail, setContactEmail, contactMessage, setContactMessage, contactSending }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const words = ["Brand", "Business", "Shop"];

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
    const interval = setInterval(() => setIndex((p) => (p + 1) % words.length), 3000);
    return () => clearInterval(interval);
  }, []);

  const s = (key: string) => content[key];
  const steps = (s("how_it_works")?.content || "").split(/\r?\n|\\n/).filter(Boolean);

  const features = [
    { icon: BarChart3, title: "Real-Time Analytics", desc: "Track every event as it happens across web and mobile platforms" },
    { icon: DollarSign, title: "Milestone Billing", desc: "Charge per download, signup, or purchase with no double counting" },
    { icon: Shield, title: "Fraud Detection", desc: "IP-based rate limiting and pattern detection built in from day one" },
    { icon: Zap, title: "Simple API", desc: "One endpoint, three event types. Integrate in minutes, not days" },
  ];

  return (
    <>
      {/* HERO — Centered Bold */}
      <section className="relative z-0 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/60 z-[1]" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-[1] h-64 bg-gradient-to-t from-background via-background/90 to-transparent" />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 text-center">
          <div className="max-w-4xl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
              <p className="mb-6 text-sm uppercase tracking-[0.3em] text-emerald-400 font-bold">Performance Attribution Platform</p>
              <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
                {s("hero")?.title?.includes("Your Brand") ? (
                  <>
                    {s("hero").title!.split("Your Brand")[0]}Your{" "}
                    <AnimatePresence mode="wait">
                      <motion.span key={words[index]} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} transition={{ duration: 0.5 }} className="text-[#22c55e]">
                        {words[index]}
                      </motion.span>
                    </AnimatePresence>
                  </>
                ) : s("hero")?.title}
              </h1>
              <p className="mt-8 mx-auto max-w-xl text-lg text-white/50">{s("hero")?.subtitle}</p>
              <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
                <Link to="/signup">
                  <GlassButton size="lg" variant="glow" className="px-12 h-14 text-lg">Start Free <ArrowRight className="h-5 w-5" /></GlassButton>
                </Link>
                <Link to="/docs">
                  <GlassButton size="lg" variant="outline" className="border-white/30 bg-white/5 px-12 h-14 text-lg backdrop-blur-md hover:bg-white/10">
                    <span className="text-white font-bold">View API Docs</span>
                  </GlassButton>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURES — Horizontal scrolling cards */}
      {s("features")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <MotionWrapper className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">{s("features")?.title}</h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">{s("features")?.subtitle}</p>
            </MotionWrapper>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {features.map((f, i) => (
                <MotionWrapper key={f.title} delay={i * 0.1}>
                  <div className="group relative overflow-hidden rounded-3xl bg-card/60 backdrop-blur-xl border border-border/50 p-8 transition-all duration-500 hover:border-primary/40 hover:shadow-[0_0_40px_rgba(34,197,94,0.1)]">
                    <div className="absolute top-0 right-0 text-[8rem] font-black text-foreground/[0.03] select-none leading-none -mt-6 -mr-4">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="relative z-10">
                      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <f.icon className="h-7 w-7" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-3">{f.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </MotionWrapper>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS — Timeline vertical layout */}
      {s("how_it_works")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10 lg:px-16 bg-muted/30">
          <div className="mx-auto max-w-3xl">
            <MotionWrapper className="text-center mb-20">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6 border border-primary/20">Process</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">{s("how_it_works")?.title}</h2>
              <p className="mt-4 text-muted-foreground text-lg">{s("how_it_works")?.subtitle}</p>
            </MotionWrapper>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />

              {steps.map((step, i) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const stepTitle = parts[0];
                const desc = parts.slice(1).join(": ");
                const isLeft = i % 2 === 0;

                return (
                  <MotionWrapper key={i} delay={i * 0.15} className="relative mb-12 last:mb-0">
                    <div className={`flex items-start gap-6 md:gap-12 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                      <div className={`hidden md:block flex-1 ${isLeft ? 'text-right' : 'text-left'}`}>
                        <h3 className="text-xl font-bold text-foreground">{stepTitle}</h3>
                        <p className="mt-2 text-muted-foreground">{desc}</p>
                      </div>
                      <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20">
                        {i + 1}
                      </div>
                      <div className="flex-1 md:hidden">
                        <h3 className="text-xl font-bold text-foreground">{stepTitle}</h3>
                        <p className="mt-2 text-muted-foreground">{desc}</p>
                      </div>
                      <div className="hidden md:block flex-1" />
                    </div>
                  </MotionWrapper>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA — Minimal centered */}
      <section className="relative z-10 py-28 px-6 sm:px-10">
        <MotionWrapper className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold text-foreground tracking-tight mb-6">Ready to migrate customers?</h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">Join the next generation of performance-driven advertisers.</p>
          <Link to="/signup">
            <GlassButton size="lg" variant="glow" className="px-12 h-14 text-lg">
              Get Started Now <ArrowRight className="h-5 w-5 ml-2" />
            </GlassButton>
          </Link>
        </MotionWrapper>
      </section>

      {/* CONTACT — Centered card */}
      {s("contact")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10 bg-muted/30">
          <div className="mx-auto max-w-xl">
            <MotionWrapper className="text-center mb-12">
              <h2 className="text-4xl font-extrabold text-foreground">{s("contact")?.title}</h2>
              <p className="mt-4 text-muted-foreground">{s("contact")?.subtitle}</p>
            </MotionWrapper>
            <div className="rounded-3xl bg-card border border-border/50 p-8 shadow-xl">
              <form onSubmit={onContactSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Name</Label>
                  <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Your name" maxLength={100} required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Email</Label>
                  <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@company.com" maxLength={255} required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Message</Label>
                  <Textarea value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="How can we help?" maxLength={2000} required rows={4} className="rounded-xl resize-none" />
                </div>
                <GlassButton type="submit" variant="glow" className="w-full h-12 rounded-xl" disabled={contactSending}>
                  {contactSending ? "Sending..." : <span className="flex items-center justify-center gap-2">Send Message <Send className="h-4 w-4" /></span>}
                </GlassButton>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      {s("footer")?.is_visible !== false && (
        <footer className="relative z-10 border-t border-border/50 py-12 px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Logo size={20} />
            <span className="text-lg font-bold text-gradient">Karbali Ads</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{s("footer")?.content}</p>
          <p className="mt-4 text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} Karbali Ads. All rights reserved.</p>
        </footer>
      )}
    </>
  );
}
