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
  const words = ["Brand", "Business", "App", "Shop"];

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
    const interval = setInterval(() => setIndex((p) => (p + 1) % words.length), 3000);
    return () => clearInterval(interval);
  }, []);

  const s = (key: string) => content[key];
  const steps = (s("how_it_works")?.content || "").split(/\r?\n|\\n/).filter(Boolean);

  const features = [
    { icon: BarChart3, title: "CORE_METRICS", desc: "Real-time data flow analysis." },
    { icon: DollarSign, title: "P2P_BILLING", desc: "Automated result-based clearing." },
    { icon: Shield, title: "FIREWALL_V2", desc: "Adaptive fraud prevention protocols." },
    { icon: Zap, title: "NODE_DEPLOY", desc: "Zero-latency integration stack." },
  ];

  return (
    <div className="bg-[#050505] text-[#00ff99] font-mono selection:bg-[#00ff99] selection:text-black">
      {/* HERO — Cyberpunk Terminal */}
      <section className="relative min-h-screen flex items-center justify-center p-6">
        <div className="absolute inset-0 z-0 opacity-20">
          <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline className="h-full w-full object-cover" />
        </div>
        <div className="relative z-10 w-full max-w-4xl border border-[#00ff99]/30 bg-black/80 backdrop-blur-xl p-8 md:p-12 rounded-lg shadow-[0_0_50px_rgba(0,255,153,0.1)]">
          <div className="flex items-center gap-2 mb-12 border-b border-[#00ff99]/20 pb-4">
             <Terminal className="w-5 h-5" />
             <span className="text-sm">KARBALI_ADS_INIT [v2.4.0]</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-8">
            {s("hero")?.title?.includes("Your Brand") ? (
              <>
                {s("hero").title!.split("Your Brand")[0]}YOUR_
                <span className="bg-[#00ff99] text-black px-2">
                  <AnimatePresence mode="wait">
                    <motion.span key={words[index]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {words[index].toUpperCase()}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </>
            ) : s("hero")?.title}
          </h1>
          <p className="text-lg md:text-xl text-[#00ff99]/60 mb-12 max-w-2xl leading-relaxed">
            {">"} {s("hero")?.subtitle}
          </p>
          <div className="flex flex-wrap gap-6">
            <Link to="/signup">
              <button className="px-10 py-4 border border-[#00ff99] hover:bg-[#00ff99] hover:text-black transition-all font-black">
                EXECUTE_SIGNUP
              </button>
            </Link>
            <Link to="/docs">
              <button className="px-10 py-4 border border-[#00ff99]/30 hover:bg-[#00ff99]/10 transition-all">
                READ_DOCS
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES — System Modules */}
      <section className="py-32 px-6">
        <div className="container mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <div key={i} className="p-8 border border-[#00ff99]/10 hover:border-[#00ff99] hover:bg-[#00ff99]/5 transition-all group">
              <div className="text-xs mb-8 text-[#00ff99]/40 group-hover:text-[#00ff99]">MODULE_0{i+1}</div>
              <f.icon className="w-10 h-10 mb-6" />
              <h3 className="text-xl font-black mb-4">{f.title}</h3>
              <p className="text-sm text-[#00ff99]/60">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-32 px-6 border-t border-[#00ff99]/10">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-20">
             <h2 className="text-4xl font-black mb-4">DEPLOYMENT_SEQUENCE</h2>
             <div className="h-1 w-20 bg-[#00ff99]" />
          </div>
          <div className="space-y-16">
            {steps.map((step, i) => {
              const title = step.split(":")[0]?.replace(/^\d+\.\s*/, "").toUpperCase() || step;
              return (
                <div key={i} className="flex gap-12 items-center">
                  <div className="text-2xl font-black shrink-0">STEP_0{i+1}</div>
                  <div className="h-[1px] flex-1 bg-[#00ff99]/20" />
                  <div className="text-xl font-bold">{title.replace(/ /g, "_")}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-[#00ff99]/10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 text-xs">
           <div className="font-black">KARBALI_ADS_NETWORK</div>
           <div>EST_2024 // ALL_RIGHTS_RESERVED</div>
        </div>
      </footer>
    </div>
  );
}
