import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, DollarSign, Send, ChevronRight } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
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
    <div className="bg-white text-black selection:bg-black selection:text-white">
      {/* HERO — Editorial magazine style with parallax */}
      <section ref={heroRef} className="relative z-0 overflow-hidden min-h-[110vh]">
        <motion.div style={{ scale: videoScale }} className="absolute inset-0 z-0">
          <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover grayscale brightness-50" />
          <div className="absolute inset-0 bg-white/10 z-[1]" />
        </motion.div>

        <motion.div style={{ y: textY, opacity: textOpacity }} className="relative z-10 flex min-h-screen items-center px-6 sm:px-10 lg:px-20">
          <div className="w-full max-w-7xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
              <div className="h-1 w-20 bg-black mb-12" />
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-[0.9] tracking-tighter uppercase mb-12 text-white">
                {s("hero")?.title?.includes("Your Brand") ? (
                  <>
                    {s("hero").title!.split("Your Brand")[0]}Your{" "}
                    <AnimatePresence mode="wait">
                      <motion.span key={words[index]} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} transition={{ duration: 0.6 }} className="inline-block border-b-8 border-white">
                        {words[index]}
                      </motion.span>
                    </AnimatePresence>
                  </>
                ) : s("hero")?.title}
              </h1>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
                <p className="max-w-xl text-xl md:text-2xl text-white font-medium leading-tight">{s("hero")?.subtitle}</p>
                <div className="flex gap-4">
                  <Link to="/signup">
                    <button className="px-12 py-5 bg-white text-black font-black uppercase tracking-widest hover:invert transition-all">
                      Get Started
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* FEATURES — Minimalist List */}
      <section className="py-40 px-6 border-b border-black/10">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-12 gap-20">
            <div className="lg:col-span-4">
              <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-8">{s("features")?.title}</h2>
              <p className="text-lg text-black/60">{s("features")?.subtitle}</p>
            </div>
            <div className="lg:col-span-8 space-y-20">
              {features.map((f, i) => (
                <div key={i} className="group grid md:grid-cols-2 gap-8 items-start border-t border-black/10 pt-12">
                  <div className="flex items-center gap-6">
                    <span className="text-4xl font-black text-black/20 group-hover:text-black transition-colors">0{i+1}</span>
                    <h3 className="text-3xl font-black uppercase tracking-tight">{f.title}</h3>
                  </div>
                  <p className="text-lg text-black/60 group-hover:text-black transition-colors">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — Bold Numeric */}
      <section className="py-40 px-6 bg-black text-white">
        <div className="container mx-auto">
          <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-center mb-32">{s("how_it_works")?.title}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step, i) => {
               const title = step.split(":")[0]?.replace(/^\d+\.\s*/, "") || step;
               const desc = step.split(":")[1] || "";
               return (
                 <div key={i} className="p-10 border border-white/20 hover:bg-white hover:text-black transition-all group">
                   <div className="text-5xl font-black mb-10">0{i+1}</div>
                   <h3 className="text-xl font-black uppercase mb-4">{title}</h3>
                   <p className="text-sm opacity-60 group-hover:opacity-100">{desc}</p>
                 </div>
               );
            })}
          </div>
        </div>
      </section>

      {/* CTA — Big and Bold */}
      <section className="py-60 px-6 text-center">
        <h2 className="text-5xl md:text-8xl lg:text-[10rem] font-black uppercase tracking-tighter leading-[0.8] mb-20">
          Ready to<br/>scale now?
        </h2>
        <Link to="/signup">
          <button className="px-20 py-8 bg-black text-white text-2xl font-black uppercase tracking-[0.2em] hover:scale-105 transition-transform">
            Start Migration
          </button>
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-black/10">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <Logo size={30} />
          <p className="font-black uppercase tracking-widest text-sm">Karbali Ads &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
