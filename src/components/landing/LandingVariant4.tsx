import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, DollarSign, Send } from "lucide-react";
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

export default function LandingVariant4({ content, onContactSubmit, contactName, setContactName, contactEmail, setContactEmail, contactMessage, setContactMessage, contactSending }: Props) {
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
    { icon: BarChart3, title: "Real-Time Analytics", desc: "Track every event as it happens across web and mobile platforms" },
    { icon: DollarSign, title: "Milestone Billing", desc: "Charge per download, signup, or purchase with no double counting" },
    { icon: Shield, title: "Fraud Detection", desc: "IP-based rate limiting and pattern detection built in from day one" },
    { icon: Zap, title: "Simple API", desc: "One endpoint, three event types. Integrate in minutes, not days" },
  ];

  return (
    <>
      {/* HERO — Brutalist bold with diagonal video clip */}
      <section className="relative z-0 overflow-hidden min-h-screen">
        <div className="absolute inset-0 z-0">
          <div className="absolute right-0 top-0 h-full w-full lg:w-[55%]" style={{ clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0% 100%)" }}>
            <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/30 z-[1]" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/95 to-transparent z-[2] lg:w-[60%]" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-[3] h-80 bg-gradient-to-t from-background via-background/95 to-transparent" />

        <div className="relative z-10 flex min-h-screen items-center px-6 sm:px-10 lg:px-20">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.3 }} className="origin-left h-1.5 w-20 bg-primary rounded-full mb-10" />

              <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.04em] text-white sm:text-6xl lg:text-8xl uppercase">
                {s("hero")?.title?.includes("Your Brand") ? (
                  <>
                    {s("hero").title!.split("Your Brand")[0]}Your{" "}
                    <AnimatePresence mode="wait">
                      <motion.span key={words[index]} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 30, opacity: 0 }} transition={{ duration: 0.4 }} className="text-primary block">
                        {words[index]}
                      </motion.span>
                    </AnimatePresence>
                  </>
                ) : s("hero")?.title}
              </h1>

              <p className="mt-8 max-w-md text-base text-white/40 leading-relaxed">{s("hero")?.subtitle}</p>

              <div className="mt-12 flex flex-wrap gap-4">
                <Link to="/signup">
                  <GlassButton size="lg" variant="glow" className="px-10 h-14">Start Free <ArrowRight className="h-4 w-4" /></GlassButton>
                </Link>
                <Link to="/docs">
                  <GlassButton size="lg" variant="outline" className="border-white/30 bg-white/5 px-10 h-14 backdrop-blur-md hover:bg-white/10">
                    <span className="text-white font-bold">View API Docs</span>
                  </GlassButton>
                </Link>
              </div>

              <div className="mt-20 flex gap-16">
                {[
                  { label: "Uptime", value: "99.9%" },
                  { label: "Events", value: "10M+" },
                  { label: "Setup", value: "5 min" },
                ].map((stat, i) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 + i * 0.1 }}>
                    <p className="text-3xl font-black text-white">{stat.value}</p>
                    <p className="text-xs text-white/25 uppercase tracking-[0.2em] mt-1">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURES — Large alternating left/right with oversized numbers */}
      {s("features")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <MotionWrapper className="mb-24">
              <h2 className="text-5xl md:text-7xl font-black text-foreground tracking-tight uppercase">{s("features")?.title}</h2>
            </MotionWrapper>

            {features.map((f, i) => (
              <MotionWrapper key={f.title} delay={i * 0.1}>
                <div className={`group flex flex-col md:flex-row items-start gap-8 md:gap-16 py-14 border-b border-border/30 last:border-0 ${i % 2 !== 0 ? "md:flex-row-reverse" : ""}`}>
                  <div className="shrink-0">
                    <span className="text-[7rem] md:text-[10rem] font-black leading-none text-foreground/[0.04] group-hover:text-primary/10 transition-colors duration-700 select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex-1 pt-4">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <f.icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-3xl font-bold text-foreground mb-4 tracking-tight">{f.title}</h3>
                    <p className="text-muted-foreground text-lg leading-relaxed max-w-lg">{f.desc}</p>
                  </div>
                </div>
              </MotionWrapper>
            ))}
          </div>
        </section>
      )}

      {/* HOW IT WORKS — Horizontal scrolling cards */}
      {s("how_it_works")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 bg-muted/20 overflow-hidden">
          <div className="mx-auto max-w-7xl">
            <MotionWrapper className="mb-16">
              <p className="text-primary text-sm font-black uppercase tracking-[0.3em] mb-4">Process</p>
              <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">{s("how_it_works")?.title}</h2>
            </MotionWrapper>

            <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
              {steps.map((step, i) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const stepTitle = parts[0];
                const desc = parts.slice(1).join(": ");

                return (
                  <MotionWrapper key={i} delay={i * 0.1}>
                    <motion.div whileHover={{ y: -8 }} className="min-w-[320px] max-w-[320px] snap-start rounded-3xl bg-card border border-border/50 p-10 flex flex-col group hover:border-primary/30 transition-colors duration-500">
                      <span className="text-6xl font-black text-primary/15 group-hover:text-primary/30 transition-colors mb-6 leading-none">{String(i + 1).padStart(2, "0")}</span>
                      <h3 className="text-xl font-bold text-foreground mb-4">{stepTitle}</h3>
                      <p className="text-muted-foreground flex-1 leading-relaxed">{desc}</p>
                    </motion.div>
                  </MotionWrapper>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA — Full-width bold */}
      <section className="relative z-10 py-32 px-6 sm:px-10">
        <MotionWrapper className="mx-auto max-w-5xl text-center">
          <h2 className="text-5xl md:text-7xl font-black text-foreground tracking-tight uppercase mb-8">Ready?</h2>
          <p className="text-muted-foreground text-lg mb-12">Start migrating customers to your brand today.</p>
          <Link to="/signup">
            <GlassButton size="lg" variant="glow" className="px-16 h-16 text-lg">Get Started <ArrowRight className="h-5 w-5 ml-2" /></GlassButton>
          </Link>
        </MotionWrapper>
      </section>

      {/* CONTACT — Dark card */}
      {s("contact")?.is_visible !== false && (
        <section className="relative z-10 py-32 px-6 sm:px-10 bg-muted/20">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-[2.5rem] bg-card border border-border/50 overflow-hidden shadow-xl">
              <div className="grid grid-cols-1 lg:grid-cols-5">
                <div className="lg:col-span-2 bg-primary/5 p-12 flex flex-col justify-center">
                  <h2 className="text-3xl font-black text-foreground mb-4">{s("contact")?.title}</h2>
                  <p className="text-muted-foreground mb-8">{s("contact")?.subtitle}</p>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>hello@karbali.com</p>
                    <p>Lagos, Nigeria</p>
                  </div>
                </div>
                <div className="lg:col-span-3 p-12">
                  <form onSubmit={onContactSubmit} className="space-y-5">
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
                      <Textarea value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="How can we help?" maxLength={2000} required rows={5} className="rounded-xl resize-none" />
                    </div>
                    <GlassButton type="submit" variant="glow" className="w-full h-12 rounded-xl" disabled={contactSending}>
                      {contactSending ? "Sending..." : <span className="flex items-center justify-center gap-2">Send Message <Send className="h-4 w-4" /></span>}
                    </GlassButton>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      {s("footer")?.is_visible !== false && (
        <footer className="relative z-10 border-t border-border/30 py-14 px-6">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Logo size={22} />
              <span className="font-black text-lg text-foreground uppercase tracking-wider">Karbali</span>
            </div>
            <p className="text-xs text-muted-foreground/40">&copy; {new Date().getFullYear()} Karbali Ads. {s("footer")?.content}</p>
          </div>
        </footer>
      )}
    </>
  );
}
