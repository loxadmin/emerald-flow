import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Zap, Target, Award } from "lucide-react";
import Logo from "@/components/Logo";
import LushLandscape from "@/components/LushLandscape";
import { motion, AnimatePresence } from "framer-motion";

const Nav = () => (
  <nav className="flex items-center justify-between px-6 py-8 md:px-12 max-w-7xl mx-auto relative z-50">
    <div className="flex items-center gap-2 group cursor-pointer">
      <div className="w-6 h-6 bg-[#22c55e] rounded-full blur-[1px] shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
      <span className="text-xl font-bold tracking-tight text-white">Karbali</span>
    </div>
    <div className="flex items-center gap-4 md:gap-8">
      <Link to="/login" className="text-sm font-semibold text-white/70 hover:text-white transition-colors">Sign In</Link>
      <Link to="/signup">
        <button className="bg-[#22c55e] text-[#050c09] px-6 py-2.5 rounded-xl font-bold hover:scale-105 hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all">
          Get Started
        </button>
      </Link>
    </div>
  </nav>
);

const Hero = () => (
  <main className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center pt-8 md:pt-16 pb-24 relative z-10">
    <div className="space-y-10">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent"
      >
        Migrate Customers to <br />
        <span className="text-white">Your Brand</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="text-xl text-white/40 max-w-md leading-relaxed font-medium"
      >
        The customer acquisition platform that helps advertisers acquire competitors' customers and only pay for real results.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col sm:flex-row items-center gap-6"
      >
        <Link to="/signup" className="w-full sm:w-auto">
          <button className="w-full sm:w-auto bg-[#22c55e] text-[#050c09] px-8 py-4 rounded-xl font-extrabold flex items-center justify-center gap-2 group hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)]">
            Start Free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </Link>
        <Link to="/docs" className="text-white font-bold hover:text-[#22c55e] transition-colors border-b border-transparent hover:border-[#22c55e]">
          View API Docs
        </Link>
      </motion.div>
    </div>

    {/* 3D Scenery Visual Container */}
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative group"
    >
      <div className="rounded-[48px] overflow-hidden border border-white/10 shadow-2xl relative aspect-[4/3] bg-[#0d1612] clay-shadow">
        <LushLandscape />

        {/* Real-time Migration Badge */}
        <div className="absolute bottom-8 left-8 right-8 flex justify-center pointer-events-none">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-3 shadow-lg">
            <div className="w-2.5 h-2.5 bg-[#22c55e] rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
            <span className="text-sm font-bold text-white/90">Migrating customers in real-time</span>
          </div>
        </div>
      </div>
      {/* Background Ambient Glow */}
      <div className="absolute -inset-10 bg-[#22c55e]/5 blur-[120px] -z-10 rounded-full opacity-50" />
    </motion.div>
  </main>
);

const Stats = ({ metrics, loading }: { metrics: any, loading: boolean }) => (
  <footer className="max-w-7xl mx-auto px-6 md:px-12 mt-12 md:mt-32 pb-24 relative z-10">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[
        { label: 'ACTIVE ADVERTISERS', icon: Target, value: metrics.advertisers },
        { label: 'CAMPAIGNS TRACKED', icon: Award, value: metrics.campaigns },
        { label: 'EVENTS PROCESSED', icon: Zap, value: metrics.events }
      ].map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          className="relative group p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all backdrop-blur-sm"
        >
          <div className="text-[#22c55e] mb-6">
            <stat.icon className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-bold tracking-tighter text-white">
              <AnimatePresence mode="wait">
                <motion.span
                  key={loading ? 'loading' : 'ready'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {loading ? "Calculating" : stat.value >= 10 ? stat.value.toLocaleString() : "Calculating"}
                </motion.span>
              </AnimatePresence>
            </h3>
            <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">{stat.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
    <div className="mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/20 font-bold uppercase tracking-widest">
      <div className="flex items-center gap-2">
        <Logo size={20} />
        <span>Karbali</span>
      </div>
      <p>&copy; {new Date().getFullYear()} Karbali. All rights reserved.</p>
    </div>
  </footer>
);

export default function Index() {
  const [metrics, setMetrics] = useState({ advertisers: 0, campaigns: 0, events: 0 });
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [advRes, campRes, eventRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("campaigns").select("id", { count: "exact", head: true }),
          supabase.from("events").select("id", { count: "exact", head: true })
        ]);

        setMetrics({
          advertisers: advRes.count || 0,
          campaigns: campRes.count || 0,
          events: eventRes.count || 0
        });
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setMetricsLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="min-h-screen bg-[#050c09] text-white font-sans selection:bg-[#22c55e]/30 overflow-x-hidden relative">
      {/* Background radial gradient for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.03),transparent_50%)] pointer-events-none" />

      <Nav />
      <Hero />
      <Stats metrics={metrics} loading={metricsLoading} />
    </div>
  );
}
