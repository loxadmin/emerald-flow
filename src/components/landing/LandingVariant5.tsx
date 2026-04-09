import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, DollarSign, Send, Terminal } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence } from "framer-motion";
import MotionWrapper from "@/components/MotionWrapper";
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

export default function LandingVariant5({ content, onContactSubmit, contactName, setContactName, contactEmail, setContactEmail, contactMessage, setContactMessage, contactSending }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const words = ["Brand", "Business", "App", "Shop"];

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
      {/* HERO — Cyberpunk grid overlay, right-aligned text */}
      <section className="relative z-0 overflow-hidden min-h-screen">
        <div className="absolute inset-0 z-0">
          <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/65 z-[1]" />
          <div className="absolute inset-0 z-[2] opacity-[0.07]" style={{
            backgroundImage: "linear-gradient(hsl(var(--primary) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }} />
          <motion.div
            animate={{ opacity: [0.03, 0.08, 0.03] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 z-[3]"
            style={{
              backgroundImage: "radial-gradient(circle at 70% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)"
            }}
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-[4] h-80 bg-gradient-to-t from-background via-background/95 to-transparent" />

        <div className="relative z-10 flex min-h-screen items-center px-6 sm:px-10 lg:px-20">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Terminal mockup */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="hidden lg:block order-1">
              <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                  <div className="h-3 w-3 rounded-full bg-red-400/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
                  <div className="h-3 w-3 rounded-full bg-green-400/60" />
                  <span className="ml-3 text-xs text-white/20 font-mono flex items-center gap-1.5"><Terminal className="h-3 w-3" /> karbali-sdk</span>
                </div>
                <div className="p-6 font-mono text-sm">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                    <p className="text-white/30">{"// Install the SDK"}</p>
                    <p className="text-primary">$ npm install @karbali/tracker</p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-4">
                    <p className="text-white/30">{"// Track an event"}</p>
                    <p><span className="text-purple-400">await</span> <span className="text-blue-400">karbali</span>.<span className="text-yellow-400">track</span>{"({"}</p>
                    <p className="pl-4"><span className="text-green-400">event</span>: <span className="text-orange-300">"signup"</span>,</p>
                    <p className="pl-4"><span className="text-green-400">userId</span>: <span className="text-orange-300">"usr_123"</span></p>
                    <p>{"})"}</p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="mt-4">
                    <p className="text-primary">✓ Event tracked successfully</p>
                    <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.8, repeat: Infinity }} className="inline-block w-2 h-4 bg-primary mt-1" />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Text — right side */}
            <div className="order-2 lg:text-right">
              <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-8 font-mono">
                  <span className="text-xs text-primary">v2.0</span>
                  <span className="text-xs text-white/30">•</span>
                  <span className="text-xs text-white/40">Now with real-time tracking</span>
                </div>
                <h1 className="text-5xl font-black leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl">
                  {s("hero")?.title?.includes("Your Brand") ? (
                    <>
                      {s("hero").title!.split("Your Brand")[0]}Your{" "}
                      <AnimatePresence mode="wait">
                        <motion.span key={words[index]} initial={{ opacity: 0, filter: "blur(10px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0, filter: "blur(10px)" }} transition={{ duration: 0.5 }} className="text-primary">
                          {words[index]}
                        </motion.span>
                      </AnimatePresence>
                    </>
                  ) : s("hero")?.title}
                </h1>
                <p className="mt-8 text-lg text-white/40 leading-relaxed lg:ml-auto max-w-lg">{s("hero")?.subtitle}</p>
                <div className="mt-12 flex flex-wrap items-center gap-4 lg:justify-end">
                  <Link to="/docs">
                    <GlassButton size="lg" variant="outline" className="border-white/30 bg-white/5 px-10 h-14 backdrop-blur-md hover:bg-white/10">
                      <span className="text-white font-bold">View API Docs</span>
                    </GlassButton>
                  </Link>
                  <Link to="/signup">
                    <GlassButton size="lg" variant="glow" className="px-10 h-14">Start Free <ArrowRight className="h-4 w-4" /></GlassButton>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES — Glowing border cards */}
      {s("features")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <MotionWrapper className="text-center mb-20">
              <p className="text-primary text-sm font-mono uppercase tracking-[0.3em] mb-4">{"<Features />"}</p>
              <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">{s("features")?.title}</h2>
            </MotionWrapper>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((f, i) => (
                <MotionWrapper key={f.title} delay={i * 0.08}>
                  <motion.div whileHover={{ y: -8, borderColor: "hsl(var(--primary) / 0.5)" }} className="group rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 text-center transition-all duration-500 hover:shadow-[0_0_40px_hsl(var(--primary)/0.1)]">
                    <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                      <f.icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </motion.div>
                </MotionWrapper>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS — Tab-style interactive selector */}
      {s("how_it_works")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 lg:px-16 bg-muted/20">
          <div className="mx-auto max-w-5xl">
            <MotionWrapper className="text-center mb-20">
              <p className="text-primary text-sm font-mono uppercase tracking-[0.3em] mb-4">{"<HowItWorks />"}</p>
              <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">{s("how_it_works")?.title}</h2>
              <p className="mt-6 text-muted-foreground text-lg max-w-2xl mx-auto">{s("how_it_works")?.subtitle}</p>
            </MotionWrapper>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Step selector */}
              <div className="lg:col-span-2 space-y-2">
                {steps.map((step, i) => {
                  const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                  const stepTitle = parts[0];
                  const isActive = activeStep === i;

                  return (
                    <motion.button
                      key={i}
                      onClick={() => setActiveStep(i)}
                      className={`w-full text-left flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-300 ${
                        isActive ? "bg-primary/10 border border-primary/30" : "hover:bg-card border border-transparent"
                      }`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>{i + 1}</span>
                      <span className={`font-semibold transition-colors ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{stepTitle}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Active step content */}
              <div className="lg:col-span-3">
                <AnimatePresence mode="wait">
                  {steps[activeStep] && (() => {
                    const parts = steps[activeStep].replace(/^\d+\.\s*/, "").split(": ");
                    const stepTitle = parts[0];
                    const desc = parts.slice(1).join(": ");

                    return (
                      <motion.div key={activeStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                        className="rounded-2xl bg-card border border-border/50 p-10 h-full flex flex-col justify-center"
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
                          <span className="text-xl font-black">{activeStep + 1}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">{stepTitle}</h3>
                        <p className="text-muted-foreground text-lg leading-relaxed">{desc}</p>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA — Gradient glow */}
      <section className="relative z-10 py-32 px-6">
        <MotionWrapper className="mx-auto max-w-3xl text-center">
          <div className="relative">
            <div className="absolute -inset-8 bg-primary/5 rounded-[3rem] blur-3xl" />
            <div className="relative">
              <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight mb-6">Ready to grow?</h2>
              <p className="text-muted-foreground text-lg mb-12">Start migrating customers to your brand today.</p>
              <Link to="/signup">
                <GlassButton size="lg" variant="glow" className="px-14 h-16 text-lg">Start Free <ArrowRight className="h-5 w-5 ml-2" /></GlassButton>
              </Link>
            </div>
          </div>
        </MotionWrapper>
      </section>

      {/* CONTACT */}
      {s("contact")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 bg-muted/20">
          <div className="mx-auto max-w-2xl">
            <MotionWrapper className="text-center mb-14">
              <h2 className="text-4xl font-black text-foreground">{s("contact")?.title}</h2>
              <p className="mt-4 text-muted-foreground text-lg">{s("contact")?.subtitle}</p>
            </MotionWrapper>
            <MotionWrapper delay={0.2}>
              <div className="rounded-2xl bg-card border border-border/50 p-8 shadow-xl">
                <form onSubmit={onContactSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-foreground font-mono">name</Label>
                      <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Your name" maxLength={100} required className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-foreground font-mono">email</Label>
                      <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@company.com" maxLength={255} required className="h-12 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-foreground font-mono">message</Label>
                    <Textarea value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="How can we help?" maxLength={2000} required rows={5} className="rounded-xl resize-none" />
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

      {/* FOOTER */}
      {s("footer")?.is_visible !== false && (
        <footer className="relative z-10 border-t border-border/30 py-14 px-6">
          <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="flex items-center gap-2">
              <Logo size={20} />
              <span className="font-bold text-foreground font-mono">Karbali</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">{s("footer")?.content}</p>
            <p className="text-xs text-muted-foreground/40 md:text-right">&copy; {new Date().getFullYear()} Karbali Ads</p>
          </div>
        </footer>
      )}
    </>
  );
}
