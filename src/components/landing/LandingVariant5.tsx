import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, DollarSign, Send, Mail, MapPin, Globe } from "lucide-react";
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
      {/* HERO — Grid overlay, right-aligned */}
      <section className="relative z-0 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/70 z-[1]" />
          <div className="absolute inset-0 z-[2] opacity-10" style={{
            backgroundImage: "linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-[1] h-64 bg-gradient-to-t from-background via-background/90 to-transparent" />

        <div className="relative z-10 flex min-h-screen items-end justify-end px-6 pb-32 pt-32 sm:px-10 lg:px-20">
          <div className="max-w-2xl text-right">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
              <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
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
              <p className="mt-6 ml-auto max-w-lg text-base text-white/50 leading-relaxed">{s("hero")?.subtitle}</p>
              <div className="mt-10 flex flex-wrap items-center justify-end gap-3">
                <Link to="/docs">
                  <GlassButton size="lg" variant="outline" className="border-white/30 bg-white/5 px-10 backdrop-blur-md hover:bg-white/10">
                    <span className="text-white font-bold">View API Docs</span>
                  </GlassButton>
                </Link>
                <Link to="/signup">
                  <GlassButton size="lg" variant="glow" className="px-10">Start Free <ArrowRight className="h-4 w-4" /></GlassButton>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURES — Glass cards grid with glow */}
      {s("features")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10 lg:px-16 bg-muted/20">
          <div className="mx-auto max-w-6xl">
            <MotionWrapper className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground">{s("features")?.title}</h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">{s("features")?.subtitle}</p>
            </MotionWrapper>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <MotionWrapper key={f.title} delay={i * 0.08}>
                  <div className="group rounded-3xl bg-card/60 backdrop-blur-xl border border-border/50 p-8 text-center transition-all duration-500 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]">
                    <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <f.icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </MotionWrapper>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS — Two-column grid: steps on left, visual on right */}
      {s("how_it_works")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <MotionWrapper className="mb-12">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4 border border-primary/20">How It Works</span>
                <h2 className="text-4xl md:text-5xl font-extrabold text-foreground">{s("how_it_works")?.title}</h2>
              </MotionWrapper>

              <div className="space-y-8">
                {steps.map((step, i) => {
                  const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                  const stepTitle = parts[0];
                  const desc = parts.slice(1).join(": ");

                  return (
                    <MotionWrapper key={i} delay={i * 0.1}>
                      <div className="flex gap-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">{i + 1}</div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{stepTitle}</h3>
                          <p className="mt-1 text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                    </MotionWrapper>
                  );
                })}
              </div>
            </div>

            <MotionWrapper delay={0.3}>
              <div className="relative rounded-3xl overflow-hidden border border-border/50 shadow-2xl">
                <video src="/hero-animation.mp4" autoPlay loop muted playsInline className="w-full object-cover" style={{ aspectRatio: "4/3" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
              </div>
            </MotionWrapper>
          </div>
        </section>
      )}

      {/* CTA — Gradient background */}
      <section className="relative z-10 py-24 px-6 bg-gradient-to-br from-primary/10 via-background to-background">
        <MotionWrapper className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6">Ready to grow?</h2>
          <p className="text-muted-foreground text-lg mb-10">Start migrating customers to your brand today.</p>
          <Link to="/signup">
            <GlassButton size="lg" variant="glow" className="px-16 h-14 text-lg">Start Free <ArrowRight className="h-5 w-5 ml-2" /></GlassButton>
          </Link>
        </MotionWrapper>
      </section>

      {/* CONTACT — Dark card with info sidebar */}
      {s("contact")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-[2rem] bg-card border border-border/50 overflow-hidden shadow-xl">
              <div className="grid grid-cols-1 lg:grid-cols-5">
                <div className="lg:col-span-2 bg-primary/5 p-10 flex flex-col justify-center">
                  <h2 className="text-3xl font-extrabold text-foreground mb-4">{s("contact")?.title}</h2>
                  <p className="text-muted-foreground mb-8">{s("contact")?.subtitle}</p>
                  <div className="space-y-4">
                    {[
                      { icon: Mail, text: "hello@karbali.com" },
                      { icon: MapPin, text: "Lagos, Nigeria" },
                      { icon: Globe, text: "@karbali_ads" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-muted-foreground">
                        <item.icon className="h-4 w-4 text-primary" />
                        <span className="text-sm">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-3 p-10">
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

      {/* FOOTER — Grid with links */}
      {s("footer")?.is_visible !== false && (
        <footer className="relative z-10 border-t border-border/50 py-16 px-6 sm:px-10">
          <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="flex items-center gap-2">
              <Logo size={20} />
              <span className="font-bold text-gradient">Karbali Ads</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">{s("footer")?.content}</p>
            <p className="text-xs text-muted-foreground/50 md:text-right">&copy; {new Date().getFullYear()} Karbali Ads. All rights reserved.</p>
          </div>
        </footer>
      )}
    </>
  );
}
