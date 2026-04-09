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
    { icon: BarChart3, title: "DATA DRIVEN", desc: "No guesswork. Just pure, unadulterated performance data." },
    { icon: DollarSign, title: "ZERO RISK", desc: "Pay after results. The ultimate performance model." },
    { icon: Shield, title: "FORTIFIED", desc: "Your business is protected by state-of-the-art systems." },
    { icon: Zap, title: "LIGHTNING", desc: "Speed is our priority. Integration in seconds." },
  ];

  return (
    <div className="bg-[#111] text-white selection:bg-[#ff0055] selection:text-white font-mono">
      {/* HERO — Brutalist Tech */}
      <section className="relative min-h-screen flex items-center border-b-4 border-white">
        <div className="absolute inset-0 z-0 grayscale contrast-150 brightness-50">
          <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline className="h-full w-full object-cover" />
        </div>
        <div className="relative z-10 container mx-auto px-6">
          <div className="max-w-4xl p-12 bg-white text-black border-4 border-black shadow-[20px_20px_0_0_#ff0055]">
            <h1 className="text-6xl md:text-8xl font-black uppercase mb-8 leading-none">
              {s("hero")?.title?.includes("Your Brand") ? (
                <>
                  {s("hero").title!.split("Your Brand")[0]}YOUR{" "}
                  <span className="text-[#ff0055] underline">
                    <AnimatePresence mode="wait">
                      <motion.span key={words[index]} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.3 }}>
                        {words[index]}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </>
              ) : s("hero")?.title}
            </h1>
            <p className="text-2xl font-bold mb-12 max-w-2xl">{s("hero")?.subtitle}</p>
            <div className="flex gap-6">
              <Link to="/signup">
                <button className="px-10 py-6 bg-black text-white text-2xl font-black uppercase hover:bg-[#ff0055] transition-colors">
                  START NOW
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES — Grid style */}
      <section className="py-32 px-6">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0 border-4 border-white">
            {features.map((f, i) => (
              <div key={i} className="p-12 border-white/20 border hover:bg-white hover:text-black transition-all group">
                <f.icon className="w-12 h-12 mb-8 group-hover:rotate-12 transition-transform" />
                <h3 className="text-3xl font-black uppercase mb-6">{f.title}</h3>
                <p className="text-lg font-bold opacity-60 group-hover:opacity-100">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-32 px-6 border-t-4 border-white">
        <div className="container mx-auto">
          <h2 className="text-6xl font-black uppercase mb-20 italic">HOW IT WORKS</h2>
          <div className="space-y-12">
            {steps.map((step, i) => {
              const title = step.split(":")[0]?.replace(/^\d+\.\s*/, "") || step;
              const desc = step.split(":")[1] || "";
              return (
                <div key={i} className="flex gap-12 items-start group">
                  <div className="text-8xl font-black text-[#ff0055] opacity-20 group-hover:opacity-100 transition-opacity leading-none">0{i+1}</div>
                  <div className="pt-2">
                    <h3 className="text-4xl font-black uppercase mb-4">{title}</h3>
                    <p className="text-2xl font-bold opacity-60">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 border-t-4 border-white">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="text-4xl font-black">KARBALI</div>
          <div className="text-lg font-bold opacity-40">SYSTEMS &copy; {new Date().getFullYear()}</div>
        </div>
      </footer>
    </div>
  );
}
