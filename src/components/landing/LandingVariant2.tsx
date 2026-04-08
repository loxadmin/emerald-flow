import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, DollarSign, Send, ChevronDown } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence } from "framer-motion";
import MotionWrapper from "@/components/MotionWrapper";
import Logo from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

export default function LandingVariant2({ content, onContactSubmit, contactName, setContactName, contactEmail, setContactEmail, contactMessage, setContactMessage, contactSending }: Props) {
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
      {/* HERO — Split layout with floating cards */}
      <section className="relative z-0 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent z-[1]" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-[1] h-64 bg-gradient-to-t from-background via-background/90 to-transparent" />

        <div className="relative z-10 flex min-h-screen items-center px-6 sm:px-10 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 w-full max-w-7xl mx-auto">
            <div className="flex flex-col justify-center">
              <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 mb-8">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Live Platform</span>
                </div>
                <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                  {s("hero")?.title?.includes("Your Brand") ? (
                    <>
                      {s("hero").title!.split("Your Brand")[0]}Your{" "}
                      <AnimatePresence mode="wait">
                        <motion.span key={words[index]} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.5 }} className="text-[#22c55e]">
                          {words[index]}
                        </motion.span>
                      </AnimatePresence>
                    </>
                  ) : s("hero")?.title}
                </h1>
                <p className="mt-6 max-w-md text-base text-white/50 leading-relaxed">{s("hero")?.subtitle}</p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <Link to="/signup">
                    <GlassButton size="lg" variant="glow" className="px-10">Start Free <ArrowRight className="h-4 w-4" /></GlassButton>
                  </Link>
                  <Link to="/docs">
                    <GlassButton size="lg" variant="outline" className="border-white/30 bg-white/5 px-10 backdrop-blur-md hover:bg-white/10">
                      <span className="text-white font-bold">View API Docs</span>
                    </GlassButton>
                  </Link>
                </div>
              </motion.div>
            </div>

            <div className="hidden lg:flex flex-col justify-center gap-6">
              {features.slice(0, 3).map((card, i) => (
                <motion.div key={card.title} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 + i * 0.15 }} className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
                    <card.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{card.title}</p>
                    <p className="text-sm text-white/40">{card.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES — Bento grid */}
      {s("features")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <MotionWrapper className="mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">{s("features")?.title}</h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-lg">{s("features")?.subtitle}</p>
            </MotionWrapper>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((f, i) => (
                <MotionWrapper key={f.title} delay={i * 0.08} className={i === 0 ? "md:col-span-2" : ""}>
                  <div className={`group rounded-3xl bg-card border border-border/50 p-8 h-full transition-all duration-500 hover:border-primary/30 hover:shadow-lg ${i === 0 ? "md:flex md:items-center md:gap-8" : ""}`}>
                    <div className={`mb-6 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110 ${i === 0 ? "md:mb-0" : ""}`}>
                      <f.icon className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2">{f.title}</h3>
                      <p className="text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                </MotionWrapper>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS — Accordion */}
      {s("how_it_works")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10 lg:px-16 bg-muted/30">
          <div className="mx-auto max-w-3xl">
            <MotionWrapper className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">{s("how_it_works")?.title}</h2>
              <p className="mt-4 text-muted-foreground text-lg">{s("how_it_works")?.subtitle}</p>
            </MotionWrapper>

            <div className="space-y-3">
              {steps.map((step, i) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const stepTitle = parts[0];
                const desc = parts.slice(1).join(": ");

                return (
                  <MotionWrapper key={i} delay={i * 0.1}>
                    <Collapsible defaultOpen={i === 0}>
                      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-2xl bg-card border border-border/50 px-6 py-5 text-left transition-all hover:border-primary/30 group">
                        <div className="flex items-center gap-4">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">{i + 1}</span>
                          <span className="font-bold text-foreground text-lg">{stepTitle}</span>
                        </div>
                        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-6 pb-5 pt-2 ml-14">
                        <p className="text-muted-foreground leading-relaxed">{desc}</p>
                      </CollapsibleContent>
                    </Collapsible>
                  </MotionWrapper>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA — Card with gradient border */}
      <section className="relative z-10 py-24 px-6 sm:px-10">
        <MotionWrapper className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-[2rem] bg-card p-12 md:p-16 text-center border border-border/50 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4">Ready to migrate customers?</h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">Join the next generation of performance-driven advertisers.</p>
            <Link to="/signup">
              <GlassButton size="lg" variant="glow" className="px-12 h-14 text-lg">Get Started Now <ArrowRight className="h-5 w-5 ml-2" /></GlassButton>
            </Link>
          </div>
        </MotionWrapper>
      </section>

      {/* CONTACT — Side by side */}
      {s("contact")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10 bg-muted/30">
          <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12">
            <MotionWrapper className="flex flex-col justify-center">
              <h2 className="text-4xl font-extrabold text-foreground mb-4">{s("contact")?.title}</h2>
              <p className="text-muted-foreground text-lg mb-8">{s("contact")?.subtitle}</p>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>📧 hello@karbali.com</p>
                <p>📍 Lagos, Nigeria</p>
                <p>🌐 @karbali_ads</p>
              </div>
            </MotionWrapper>
            <MotionWrapper delay={0.2}>
              <div className="rounded-3xl bg-card border border-border/50 p-8 shadow-xl">
                <form onSubmit={onContactSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Name</Label>
                      <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Your name" maxLength={100} required className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Email</Label>
                      <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@company.com" maxLength={255} required className="h-12 rounded-xl" />
                    </div>
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
            </MotionWrapper>
          </div>
        </section>
      )}

      {/* FOOTER — Minimal */}
      {s("footer")?.is_visible !== false && (
        <footer className="relative z-10 border-t border-border/50 py-12 px-6">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Logo size={20} />
              <span className="font-bold text-gradient">Karbali Ads</span>
            </div>
            <p className="text-sm text-muted-foreground">{s("footer")?.content}</p>
            <p className="text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} Karbali Ads</p>
          </div>
        </footer>
      )}
    </>
  );
}
