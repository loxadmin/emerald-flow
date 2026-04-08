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
      {/* HERO — Diagonal split */}
      <section className="relative z-0 overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <div className="absolute right-0 top-0 h-full w-full lg:w-[60%]" style={{ clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0% 100%)" }}>
            <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-[1] h-64 bg-gradient-to-t from-background via-background/90 to-transparent" />

        <div className="relative z-10 flex min-h-screen items-center px-6 sm:px-10 lg:px-20">
          <div className="max-w-xl">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
              <div className="mb-8 h-1 w-16 bg-primary rounded-full" />
              <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-7xl">
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

              <div className="mt-16 flex gap-12">
                {[
                  { label: "Uptime", value: "99.9%" },
                  { label: "Events Tracked", value: "10M+" },
                  { label: "Avg Integration", value: "5 min" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-2xl font-black text-white">{stat.value}</p>
                    <p className="text-xs text-white/30 uppercase tracking-wider mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURES — Large icon left, text right alternating */}
      {s("features")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-5xl space-y-20">
            <MotionWrapper className="text-center mb-8">
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground">{s("features")?.title}</h2>
            </MotionWrapper>

            {features.map((f, i) => (
              <MotionWrapper key={f.title} delay={i * 0.1}>
                <div className={`flex flex-col md:flex-row items-center gap-12 ${i % 2 !== 0 ? "md:flex-row-reverse" : ""}`}>
                  <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-[2rem] bg-primary/10 text-primary">
                    <f.icon className="h-16 w-16" />
                  </div>
                  <div className={`${i % 2 !== 0 ? "md:text-right" : ""}`}>
                    <h3 className="text-2xl font-bold text-foreground mb-3">{f.title}</h3>
                    <p className="text-muted-foreground text-lg leading-relaxed max-w-lg">{f.desc}</p>
                  </div>
                </div>
              </MotionWrapper>
            ))}
          </div>
        </section>
      )}

      {/* HOW IT WORKS — Horizontal cards scroll */}
      {s("how_it_works")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10 bg-muted/30 overflow-hidden">
          <div className="mx-auto max-w-7xl">
            <MotionWrapper className="mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground">{s("how_it_works")?.title}</h2>
              <p className="mt-4 text-muted-foreground text-lg">{s("how_it_works")?.subtitle}</p>
            </MotionWrapper>

            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
              {steps.map((step, i) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const stepTitle = parts[0];
                const desc = parts.slice(1).join(": ");

                return (
                  <MotionWrapper key={i} delay={i * 0.1}>
                    <div className="min-w-[300px] snap-start rounded-3xl bg-card border border-border/50 p-8 flex flex-col">
                      <span className="text-6xl font-black text-primary/20 mb-4">{String(i + 1).padStart(2, "0")}</span>
                      <h3 className="text-xl font-bold text-foreground mb-3">{stepTitle}</h3>
                      <p className="text-muted-foreground flex-1">{desc}</p>
                    </div>
                  </MotionWrapper>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA — Stats row + button */}
      <section className="relative z-10 py-24 px-6 sm:px-10">
        <MotionWrapper className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              { label: "Advertisers", value: "500+" },
              { label: "Events Tracked", value: "10M+" },
              { label: "Uptime", value: "99.9%" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-5xl font-black text-primary">{stat.value}</p>
                <p className="mt-2 text-muted-foreground uppercase tracking-wider text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link to="/signup">
              <GlassButton size="lg" variant="glow" className="px-16 h-16 text-lg">Get Started Now <ArrowRight className="h-5 w-5 ml-2" /></GlassButton>
            </Link>
          </div>
        </MotionWrapper>
      </section>

      {/* CONTACT — Minimal inline */}
      {s("contact")?.is_visible !== false && (
        <section className="relative z-10 py-28 px-6 sm:px-10 bg-muted/30">
          <div className="mx-auto max-w-xl">
            <MotionWrapper className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-foreground">{s("contact")?.title}</h2>
              <p className="mt-3 text-muted-foreground">{s("contact")?.subtitle}</p>
            </MotionWrapper>
            <form onSubmit={onContactSubmit} className="space-y-4">
              <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Name" maxLength={100} required className="h-14 rounded-2xl px-6 text-base" />
              <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Email" maxLength={255} required className="h-14 rounded-2xl px-6 text-base" />
              <Textarea value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="Message" maxLength={2000} required rows={4} className="rounded-2xl px-6 py-4 text-base resize-none" />
              <GlassButton type="submit" variant="glow" className="w-full h-14 rounded-2xl text-base" disabled={contactSending}>
                {contactSending ? "Sending..." : "Send Message"}
              </GlassButton>
            </form>
          </div>
        </section>
      )}

      {/* FOOTER */}
      {s("footer")?.is_visible !== false && (
        <footer className="relative z-10 border-t border-border/50 py-12 px-6">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Logo size={22} />
              <span className="font-bold text-lg text-gradient">Karbali Ads</span>
            </div>
            <p className="text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} Karbali Ads. {s("footer")?.content}</p>
          </div>
        </footer>
      )}
    </>
  );
}
