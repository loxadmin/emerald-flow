import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, DollarSign, Send, Play } from "lucide-react";
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

export default function LandingVariant3({ content, onContactSubmit, contactName, setContactName, contactEmail, setContactEmail, contactMessage, setContactMessage, contactSending }: Props) {
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
    { icon: BarChart3, title: "Real-Time Analytics", desc: "Track every event as it happens" },
    { icon: DollarSign, title: "Milestone Billing", desc: "Pay only for real results" },
    { icon: Shield, title: "Fraud Detection", desc: "Built-in IP rate limiting" },
    { icon: Zap, title: "Simple API", desc: "Integrate in minutes" },
  ];

  return (
    <>
      {/* HERO — Video Window centered */}
      <section className="relative z-0 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-black">
          <div className="absolute inset-0 opacity-30">
            <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-[1] h-64 bg-gradient-to-t from-background via-background/90 to-transparent" />

        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="relative mb-12 overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-emerald-500/10"
            style={{ width: "min(90vw, 600px)", aspectRatio: "16/9" }}>
            <video src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                <Play className="h-6 w-6 text-white ml-1" fill="white" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
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
            <p className="mt-6 mx-auto max-w-lg text-base text-white/50 leading-relaxed">{s("hero")?.subtitle}</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
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
      </section>

      {/* FEATURES — Icon row with dividers */}
      {s("features")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <MotionWrapper className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground">{s("features")?.title}</h2>
            </MotionWrapper>

            <div className="flex flex-col md:flex-row items-stretch divide-y md:divide-y-0 md:divide-x divide-border/50">
              {features.map((f, i) => (
                <MotionWrapper key={f.title} delay={i * 0.1} className="flex-1 px-8 py-8 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <f.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </MotionWrapper>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS — Numbered list minimal */}
      {s("how_it_works")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10 lg:px-16 bg-muted/30">
          <div className="mx-auto max-w-4xl">
            <MotionWrapper className="mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground text-center">{s("how_it_works")?.title}</h2>
              <p className="mt-4 text-muted-foreground text-center text-lg">{s("how_it_works")?.subtitle}</p>
            </MotionWrapper>

            <div className="space-y-0 border-l-2 border-primary/20 ml-6">
              {steps.map((step, i) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const stepTitle = parts[0];
                const desc = parts.slice(1).join(": ");

                return (
                  <MotionWrapper key={i} delay={i * 0.1}>
                    <div className="relative pl-10 pb-12 last:pb-0">
                      <div className="absolute -left-[13px] top-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{i + 1}</div>
                      <h3 className="text-xl font-bold text-foreground">{stepTitle}</h3>
                      <p className="mt-2 text-muted-foreground">{desc}</p>
                    </div>
                  </MotionWrapper>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA — Full-width dark band */}
      <section className="relative z-10 py-24 px-6 bg-card">
        <MotionWrapper className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-6">Start acquiring customers today</h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto text-lg">No setup fees. No long-term contracts. Pay only for results.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup">
              <GlassButton size="lg" variant="glow" className="px-12 h-14 text-lg">Get Started <ArrowRight className="h-5 w-5 ml-2" /></GlassButton>
            </Link>
            <Link to="/docs">
              <GlassButton size="lg" variant="outline" className="px-12 h-14 text-lg border-border">API Docs</GlassButton>
            </Link>
          </div>
        </MotionWrapper>
      </section>

      {/* CONTACT — Full-width form */}
      {s("contact")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <MotionWrapper className="mb-12">
              <h2 className="text-4xl font-extrabold text-foreground">{s("contact")?.title}</h2>
              <p className="mt-4 text-muted-foreground text-lg">{s("contact")?.subtitle}</p>
            </MotionWrapper>
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
          </div>
        </section>
      )}

      {/* FOOTER */}
      {s("footer")?.is_visible !== false && (
        <footer className="relative z-10 border-t border-border/50 py-16 px-6 text-center">
          <Logo size={28} />
          <p className="mt-4 text-sm text-muted-foreground">{s("footer")?.content}</p>
          <p className="mt-2 text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} Karbali Ads</p>
        </footer>
      )}
    </>
  );
}
