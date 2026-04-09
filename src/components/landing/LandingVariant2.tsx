import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, DollarSign, Send, ChevronDown, Plus, Minus } from "lucide-react";
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

export default function LandingVariant2({ content, onContactSubmit, contactName, setContactName, contactEmail, setContactEmail, contactMessage, setContactMessage, contactSending }: Props) {
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
    { icon: BarChart3, title: "Analytics", desc: "Real-time tracking for every event.", class: "md:col-span-2 md:row-span-2 bg-primary/10" },
    { icon: DollarSign, title: "Billing", desc: "Pay only for verified results.", class: "bg-muted" },
    { icon: Shield, title: "Security", desc: "Advanced fraud protection.", class: "bg-muted" },
    { icon: Zap, title: "Fast API", desc: "Integrate in minutes.", class: "md:col-span-2 bg-primary text-primary-foreground" },
  ];

  return (
    <div className="bg-background text-foreground selection:bg-primary/30">
      {/* HERO — Split with glassmorphism dashboard preview */}
      <section className="relative min-h-screen flex items-center pt-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
              <h1 className="text-6xl md:text-7xl font-black tracking-tighter mb-8 leading-[1.05]">
                {s("hero")?.title?.includes("Your Brand") ? (
                  <>
                    {s("hero").title!.split("Your Brand")[0]}Your{" "}
                    <span className="text-primary italic">
                      <AnimatePresence mode="wait">
                        <motion.span key={words[index]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          {words[index]}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </>
                ) : s("hero")?.title}
              </h1>
              <p className="text-xl text-muted-foreground mb-12 max-w-lg leading-relaxed">{s("hero")?.subtitle}</p>
              <div className="flex flex-wrap gap-4">
                <Link to="/signup">
                  <button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-2xl hover:shadow-xl hover:shadow-primary/20 transition-all">
                    Start Campaign
                  </button>
                </Link>
                <Link to="/docs">
                  <button className="h-14 px-8 bg-muted font-bold rounded-2xl hover:bg-muted/80 transition-all">
                    API Docs
                  </button>
                </Link>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative">
               <div className="aspect-video rounded-3xl bg-card border border-border shadow-2xl p-8 overflow-hidden">
                 <div className="flex items-center justify-between mb-8">
                   <div className="flex gap-2">
                     <div className="w-3 h-3 rounded-full bg-primary/20" />
                     <div className="w-3 h-3 rounded-full bg-primary/20" />
                   </div>
                   <div className="text-xs font-mono text-muted-foreground">LIVE_ANALYTICS</div>
                 </div>
                 <div className="space-y-6">
                    <div className="h-4 bg-muted rounded-full w-3/4" />
                    <div className="h-4 bg-muted rounded-full w-1/2" />
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-20 bg-primary/5 rounded-2xl border border-primary/10" />
                      <div className="h-20 bg-primary/5 rounded-2xl border border-primary/10" />
                      <div className="h-20 bg-primary/20 rounded-2xl border border-primary/30" />
                    </div>
                 </div>
               </div>
               <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/10 blur-3xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURES — Bento grid */}
      <section className="py-32 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-20">
             <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">{s("features")?.title}</h2>
             <p className="text-muted-foreground">{s("features")?.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <div key={i} className={`p-8 rounded-3xl flex flex-col justify-end min-h-[240px] border border-border/50 hover:shadow-xl transition-all group ${f.class}`}>
                <f.icon className="w-8 h-8 mb-auto group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-sm opacity-70">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 border-t border-border/50">
        <div className="container mx-auto px-6 text-center">
           <Logo size={24} className="mx-auto mb-8" />
           <p className="text-sm text-muted-foreground">{s("footer")?.content}</p>
        </div>
      </footer>
    </div>
  );
}
