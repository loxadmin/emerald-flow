import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, DollarSign, Send, ChevronDown, Plus, Minus } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence } from "framer-motion";
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
  const [openStep, setOpenStep] = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const words = ["Brand", "Business", "App", "Shop"];

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
    const interval = setInterval(() => setIndex((p) => (p + 1) % words.length), 3000);
    return () => clearInterval(interval);
  }, []);

  const s = (key: string) => content[key];
  const steps = (s("how_it_works")?.content || "").split(/\r?\n|\\n/).filter(Boolean);

  const features = [
    { icon: BarChart3, title: "Real-Time Analytics", desc: "Track every event as it happens across web and mobile platforms", color: "from-blue-500/20 to-cyan-500/20" },
    { icon: DollarSign, title: "Milestone Billing", desc: "Charge per download, signup, or purchase with no double counting", color: "from-emerald-500/20 to-green-500/20" },
    { icon: Shield, title: "Fraud Detection", desc: "IP-based rate limiting and pattern detection built in from day one", color: "from-amber-500/20 to-orange-500/20" },
    { icon: Zap, title: "Simple API", desc: "One endpoint, three event types. Integrate in minutes, not days", color: "from-violet-500/20 to-purple-500/20" },
  ];

  return (
    <>
      {/* HERO — Split with glassmorphism dashboard preview */}
      <section className="relative z-0 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40 z-[1]" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-[3] h-80 bg-gradient-to-t from-background via-background/95 to-transparent" />

        <div className="relative z-10 flex min-h-screen items-center px-6 sm:px-10 lg:px-20">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm px-4 py-2 mb-8">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Live Platform</span>
              </div>
              <h1 className="text-5xl font-black leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl">
                {s("hero")?.title?.includes("Your Brand") ? (
                  <>
                    {s("hero").title!.split("Your Brand")[0]}Your{" "}
                    <AnimatePresence mode="wait">
                      <motion.span key={words[index]} initial={{ rotateX: 90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} exit={{ rotateX: -90, opacity: 0 }} transition={{ duration: 0.5 }} className="text-primary inline-block">
                        {words[index]}
                      </motion.span>
                    </AnimatePresence>
                  </>
                ) : s("hero")?.title}
              </h1>
              <p className="mt-8 max-w-md text-lg text-white/50 leading-relaxed">{s("hero")?.subtitle}</p>
              <div className="mt-12 flex flex-wrap items-center gap-4">
                <Link to="/signup">
                  <GlassButton size="lg" variant="glow" className="px-10 h-14">Start Free <ArrowRight className="h-4 w-4" /></GlassButton>
                </Link>
                <Link to="/docs">
                  <GlassButton size="lg" variant="outline" className="border-white/30 bg-white/5 px-10 h-14 backdrop-blur-md hover:bg-white/10">
                    <span className="text-white font-bold">View API Docs</span>
                  </GlassButton>
                </Link>
              </div>
            </motion.div>

            {/* Floating dashboard mockup */}
            <motion.div initial={{ opacity: 0, y: 40, rotateY: -10 }} animate={{ opacity: 1, y: 0, rotateY: 0 }} transition={{ duration: 1, delay: 0.4 }} className="hidden lg:block perspective-[1200px]">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-3 w-3 rounded-full bg-red-400/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
                  <div className="h-3 w-3 rounded-full bg-green-400/60" />
                  <span className="ml-3 text-xs text-white/30 font-mono">dashboard.karbali.com</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Active Campaigns", value: "12" },
                    { label: "Total Events", value: "847K" },
                    { label: "Revenue", value: "₦2.4M" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-white/5 border border-white/5 p-4">
                      <p className="text-lg font-bold text-white">{s.value}</p>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="h-28 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-white/5 flex items-end p-4 gap-1">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                    <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 1 + i * 0.05, duration: 0.5 }} className="flex-1 rounded-t bg-primary/40" />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURES — Bento grid with hover effects */}
      {s("features")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <MotionWrapper className="text-center mb-20">
              <p className="text-primary text-sm font-bold uppercase tracking-[0.3em] mb-4">Features</p>
              <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">{s("features")?.title}</h2>
              <p className="mt-6 text-muted-foreground text-lg max-w-2xl mx-auto">{s("features")?.subtitle}</p>
            </MotionWrapper>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((f, i) => (
                <MotionWrapper key={f.title} delay={i * 0.08}>
                  <motion.div
                    onHoverStart={() => setHoveredFeature(i)}
                    onHoverEnd={() => setHoveredFeature(null)}
                    whileHover={{ scale: 1.02 }}
                    className="group relative overflow-hidden rounded-3xl border border-border/50 bg-card p-10 h-full cursor-default"
                  >
                    <motion.div
                      animate={{ opacity: hoveredFeature === i ? 0.15 : 0 }}
                      className={`absolute inset-0 bg-gradient-to-br ${f.color}`}
                    />
                    <div className="relative z-10">
                      <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <f.icon className="h-7 w-7" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-3">{f.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </motion.div>
                </MotionWrapper>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS — Interactive accordion with animated indicator */}
      {s("how_it_works")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 lg:px-16 bg-muted/20">
          <div className="mx-auto max-w-4xl">
            <MotionWrapper className="text-center mb-20">
              <p className="text-primary text-sm font-bold uppercase tracking-[0.3em] mb-4">Process</p>
              <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">{s("how_it_works")?.title}</h2>
              <p className="mt-6 text-muted-foreground text-lg">{s("how_it_works")?.subtitle}</p>
            </MotionWrapper>

            <div className="space-y-3">
              {steps.map((step, i) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const stepTitle = parts[0];
                const desc = parts.slice(1).join(": ");
                const isOpen = openStep === i;

                return (
                  <MotionWrapper key={i} delay={i * 0.1}>
                    <motion.div layout className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${isOpen ? "border-primary/30 bg-card shadow-lg shadow-primary/5" : "border-border/50 bg-card/60"}`}>
                      <button onClick={() => setOpenStep(isOpen ? -1 : i)} className="flex w-full items-center justify-between px-8 py-6 text-left">
                        <div className="flex items-center gap-5">
                          <motion.div animate={{ backgroundColor: isOpen ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.1)" }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors">
                            <span className={`font-bold text-sm ${isOpen ? "text-primary-foreground" : "text-primary"}`}>{i + 1}</span>
                          </motion.div>
                          <span className="font-bold text-foreground text-lg">{stepTitle}</span>
                        </div>
                        {isOpen ? <Minus className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-muted-foreground" />}
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                            <div className="px-8 pb-6 pl-[5.5rem]">
                              <p className="text-muted-foreground leading-relaxed">{desc}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </MotionWrapper>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA — Gradient glow card */}
      <section className="relative z-10 py-28 px-6 sm:px-10">
        <MotionWrapper className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-card border border-border/50 p-14 md:p-20 text-center">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-80 bg-primary/20 rounded-full blur-[100px]" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-black text-foreground mb-6">Ready to migrate customers?</h2>
              <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">Join the next generation of performance-driven advertisers.</p>
              <Link to="/signup">
                <GlassButton size="lg" variant="glow" className="px-14 h-16 text-lg">Get Started <ArrowRight className="h-5 w-5 ml-2" /></GlassButton>
              </Link>
            </div>
          </div>
        </MotionWrapper>
      </section>

      {/* CONTACT */}
      {s("contact")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 bg-muted/20">
          <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-16">
            <MotionWrapper className="flex flex-col justify-center">
              <h2 className="text-4xl md:text-5xl font-black text-foreground mb-6">{s("contact")?.title}</h2>
              <p className="text-muted-foreground text-lg mb-10">{s("contact")?.subtitle}</p>
              <div className="space-y-4">
                <p className="text-muted-foreground flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-primary" /> hello@karbali.com</p>
                <p className="text-muted-foreground flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-primary" /> Lagos, Nigeria</p>
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

      {/* FOOTER */}
      {s("footer")?.is_visible !== false && (
        <Footer content={s("footer")?.content} />
      )}
    </>
  );
}
