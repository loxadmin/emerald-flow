import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, DollarSign, Send, ChevronRight } from "lucide-react";
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

export default function LandingVariant1({ content, onContactSubmit, contactName, setContactName, contactEmail, setContactEmail, contactMessage, setContactMessage, contactSending }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const words = ["Brand", "Business", "App", "Shop"];

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

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
      {/* HERO — Editorial magazine style with parallax */}
      <section ref={heroRef} className="relative z-0 overflow-hidden min-h-[110vh]">
        <motion.div style={{ scale: videoScale }} className="absolute inset-0 z-0">
          <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/50 z-[1]" />
        </motion.div>
        <div className="absolute bottom-0 left-0 right-0 z-[3] h-80 bg-gradient-to-t from-background via-background/95 to-transparent" />

        <motion.div style={{ y: textY, opacity: textOpacity }} className="relative z-10 flex min-h-screen items-center px-6 sm:px-10 lg:px-20">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: 80 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-1 bg-primary rounded-full mb-10"
                />
                <h1 className="text-5xl font-black leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]">
                  {s("hero")?.title?.includes("Your Brand") ? (
                    <>
                      {s("hero").title!.split("Your Brand")[0]}Your{" "}
                      <AnimatePresence mode="wait">
                        <motion.span key={words[index]} initial={{ y: 40, opacity: 0, filter: "blur(8px)" }} animate={{ y: 0, opacity: 1, filter: "blur(0px)" }} exit={{ y: -40, opacity: 0, filter: "blur(8px)" }} transition={{ duration: 0.6 }} className="text-primary inline-block">
                          {words[index]}
                        </motion.span>
                      </AnimatePresence>
                    </>
                  ) : s("hero")?.title}
                </h1>
                <p className="mt-8 max-w-lg text-lg text-white/50 leading-relaxed font-light">{s("hero")?.subtitle}</p>
                <div className="mt-12 flex flex-wrap items-center gap-4">
                  <Link to="/signup">
                    <GlassButton size="lg" variant="glow" className="px-10 h-14 text-base">Start Free <ArrowRight className="h-4 w-4" /></GlassButton>
                  </Link>
                  <Link to="/docs">
                    <GlassButton size="lg" variant="outline" className="border-white/30 bg-white/5 px-10 h-14 backdrop-blur-md hover:bg-white/10">
                      <span className="text-white font-bold">View API Docs</span>
                    </GlassButton>
                  </Link>
                </div>
              </motion.div>
            </div>
            <div className="lg:col-span-5 hidden lg:block">
              <motion.div initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.5 }} className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-primary/10 blur-xl" />
                <div className="relative grid grid-cols-2 gap-3">
                  {[
                    { value: "99.9%", label: "Uptime" },
                    { value: "10M+", label: "Events" },
                    { value: "<5min", label: "Integration" },
                    { value: "0%", label: "Fraud Rate" },
                  ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 + i * 0.1 }}
                      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 text-center">
                      <p className="text-2xl font-black text-white">{stat.value}</p>
                      <p className="text-xs text-white/40 uppercase tracking-wider mt-1">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FEATURES — Staggered asymmetric cards */}
      {s("features")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <MotionWrapper className="mb-20">
              <p className="text-primary text-sm font-bold uppercase tracking-[0.3em] mb-4">Capabilities</p>
              <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight leading-[1.05]">{s("features")?.title}</h2>
            </MotionWrapper>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((f, i) => (
                <MotionWrapper key={f.title} delay={i * 0.1}>
                  <motion.div whileHover={{ y: -8, transition: { duration: 0.3 } }} className={`group relative overflow-hidden rounded-[2rem] border border-border/50 bg-card/80 backdrop-blur-sm p-10 transition-colors duration-500 hover:border-primary/40 ${i === 0 ? "md:row-span-2 md:flex md:flex-col md:justify-between" : ""}`}>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl translate-x-10 -translate-y-10 group-hover:bg-primary/10 transition-colors duration-700" />
                    <div className="relative z-10">
                      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-all duration-500">
                        <f.icon className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-4 tracking-tight">{f.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-base">{f.desc}</p>
                    </div>
                    <div className="mt-8 flex items-center gap-2 text-primary/60 group-hover:text-primary transition-colors duration-500">
                      <span className="text-sm font-semibold">Learn more</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                </MotionWrapper>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS — Cinematic numbered sections */}
      {s("how_it_works")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 lg:px-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30 pointer-events-none" />
          <div className="relative mx-auto max-w-5xl">
            <MotionWrapper className="text-center mb-24">
              <p className="text-primary text-sm font-bold uppercase tracking-[0.3em] mb-4">Process</p>
              <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">{s("how_it_works")?.title}</h2>
              <p className="mt-6 text-muted-foreground text-lg max-w-2xl mx-auto">{s("how_it_works")?.subtitle}</p>
            </MotionWrapper>

            <div className="space-y-0">
              {steps.map((step, i) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const stepTitle = parts[0];
                const desc = parts.slice(1).join(": ");

                return (
                  <MotionWrapper key={i} delay={i * 0.15}>
                    <div className="group flex items-start gap-8 py-10 border-b border-border/30 last:border-0 transition-all hover:pl-4 duration-500">
                      <span className="text-7xl font-black text-primary/10 group-hover:text-primary/30 transition-colors duration-500 leading-none select-none shrink-0 w-24 text-right">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="pt-2">
                        <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-500">{stepTitle}</h3>
                        <p className="text-muted-foreground text-base leading-relaxed max-w-xl">{desc}</p>
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
      <section className="relative z-10 py-28 px-6 sm:px-10">
        <MotionWrapper className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight mb-6">Start acquiring customers today</h2>
          <p className="text-muted-foreground text-lg mb-12 max-w-xl mx-auto">No setup fees. No long-term contracts. Pay only for results.</p>
          <Link to="/signup">
            <GlassButton size="lg" variant="glow" className="px-14 h-16 text-lg">
              Get Started Now <ArrowRight className="h-5 w-5 ml-2" />
            </GlassButton>
          </Link>
        </MotionWrapper>
      </section>

      {/* CONTACT */}
      {s("contact")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 bg-muted/20">
          <div className="mx-auto max-w-2xl">
            <MotionWrapper className="text-center mb-14">
              <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">{s("contact")?.title}</h2>
              <p className="mt-4 text-muted-foreground text-lg">{s("contact")?.subtitle}</p>
            </MotionWrapper>
            <MotionWrapper delay={0.2}>
              <form onSubmit={onContactSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Name</Label>
                    <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Your name" maxLength={100} required className="h-13 rounded-2xl border-border/40 bg-card px-5" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Email</Label>
                    <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@company.com" maxLength={255} required className="h-13 rounded-2xl border-border/40 bg-card px-5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Message</Label>
                  <Textarea value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="How can we help?" maxLength={2000} required rows={5} className="rounded-2xl border-border/40 bg-card px-5 resize-none" />
                </div>
                <GlassButton type="submit" variant="glow" className="w-full h-13 rounded-2xl" disabled={contactSending}>
                  {contactSending ? "Sending..." : <span className="flex items-center justify-center gap-2">Send Message <Send className="h-4 w-4" /></span>}
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
