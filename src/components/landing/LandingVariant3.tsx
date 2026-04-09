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

export default function LandingVariant3({ content, onContactSubmit, contactName, setContactName, contactEmail, setContactEmail, contactMessage, setContactMessage, contactSending }: Props) {
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
    { icon: BarChart3, title: "Precision Analytics", desc: "Every metric captured with 100% accuracy." },
    { icon: DollarSign, title: "Smart Billing", desc: "Performance-based rewards for real results." },
    { icon: Shield, title: "Vault Security", desc: "Military-grade protection for your data." },
    { icon: Zap, title: "Instant Access", desc: "Go live in less than 5 minutes." },
  ];

  return (
    <div className="bg-[#f5f5f7] text-[#1d1d1f] font-sans selection:bg-[#0071e3] selection:text-white">
      {/* HERO — Apple-style Product Launch */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5 }} className="absolute inset-0 z-0">
          <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-white/20" />
        </motion.div>

        <div className="relative z-10 pt-20">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-6xl md:text-8xl font-bold tracking-tight mb-8">
            {s("hero")?.title?.includes("Your Brand") ? (
              <>
                {s("hero").title!.split("Your Brand")[0]}Your<br/>
                <span className="text-[#0071e3]">
                  <AnimatePresence mode="wait">
                    <motion.span key={words[index]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                      {words[index]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </>
            ) : s("hero")?.title}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-2xl md:text-3xl font-medium text-[#86868b] max-w-3xl mx-auto mb-12">
            {s("hero")?.subtitle}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/signup">
              <button className="h-14 px-10 bg-[#0071e3] text-white rounded-full font-bold hover:bg-[#0077ed] transition-colors text-lg">
                Get Started
              </button>
            </Link>
            <Link to="/docs" className="text-[#0071e3] font-bold text-lg hover:underline flex items-center gap-1">
              Learn more <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FEATURES — Grid style */}
      <section className="py-40 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12">
            {features.map((f, i) => (
              <div key={i} className="p-12 rounded-[2.5rem] bg-white shadow-sm hover:shadow-xl transition-all duration-500">
                <f.icon className="w-12 h-12 text-[#0071e3] mb-8" />
                <h3 className="text-4xl font-bold mb-4 tracking-tight">{f.title}</h3>
                <p className="text-xl text-[#86868b] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — Big visual steps */}
      <section className="py-40 px-6 bg-white overflow-hidden">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-5xl md:text-7xl font-bold mb-32 tracking-tight">{s("how_it_works")?.title}</h2>
          <div className="space-y-40">
            {steps.map((step, i) => {
              const title = step.split(":")[0]?.replace(/^\d+\.\s*/, "") || step;
              const desc = step.split(":")[1] || "";
              return (
                <div key={i} className={`flex flex-col items-center ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-20`}>
                  <div className="flex-1 text-left">
                    <div className="text-[#0071e3] font-bold mb-4 uppercase tracking-widest">Step 0{i+1}</div>
                    <h3 className="text-5xl font-bold mb-6 tracking-tight">{title}</h3>
                    <p className="text-xl text-[#86868b] leading-relaxed">{desc}</p>
                  </div>
                  <div className="flex-1 w-full aspect-video rounded-3xl bg-[#f5f5f7] flex items-center justify-center text-4xl font-bold text-black/10">
                     Visual Mockup
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 bg-[#f5f5f7] border-t border-black/5">
        <div className="container mx-auto px-6 max-w-5xl text-center">
          <Logo size={24} className="mx-auto mb-10 opacity-50" />
          <p className="text-[#86868b] text-sm max-w-2xl mx-auto">{s("footer")?.content}</p>
        </div>
      </footer>
    </div>
  );
}
