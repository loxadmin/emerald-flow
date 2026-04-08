import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { BarChart3, Shield, Zap, DollarSign, ArrowRight, Users, Target, TrendingUp, Mail, Phone, MapPin, Sun, Moon } from "lucide-react";
import Logo from "@/components/Logo";
import { useTheme } from "@/lib/theme";
import LushLandscape from "@/components/LushLandscape";
import { motion } from "framer-motion";

interface SiteContent {
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  is_visible: boolean;
}

const defaultContent: Record<string, SiteContent> = {
  hero: { section_key: "hero", title: "Migrate Customers to Your Brand", subtitle: "The performance attribution platform that helps advertisers acquire competitors' customers and only pay for real results.", content: null, is_visible: true },
  about: { section_key: "about", title: "About Karbali", subtitle: "We built Karbali to solve a simple problem: advertisers waste money on clicks and impressions that never convert.", content: "Karbali is a performance-based attribution platform. We connect advertisers with real users and charge only for measurable outcomes like downloads, signups, and purchases. No wasted ad spend. No guesswork. Just results.", is_visible: true },
  how_it_works: { section_key: "how_it_works", title: "How It Works", subtitle: "From campaign creation to verified results in four simple steps.", content: "1. Create a Campaign: Set your budget and define what you will pay for.\n2. Integrate Our API: Add a simple tracking snippet to your app.\n3. Get Approved: Our team verifies your integration.\n4. Track and Pay for Results: Only pay when users take action.", is_visible: true },
  features: { section_key: "features", title: "Why Choose Karbali", subtitle: "Built for performance-driven advertisers who demand transparency.", content: null, is_visible: true },
  contact: { section_key: "contact", title: "Get in Touch", subtitle: "Have questions? We would love to hear from you.", content: "Email: support@karbali.com\nPhone: +1 (555) 123-4567\nAddress: Lagos, Nigeria", is_visible: true },
  footer: { section_key: "footer", title: "Karbali", subtitle: null, content: "Performance Attribution Platform. Track real outcomes, not vanity metrics.", is_visible: true },
};

export default function Index() {
  const [content, setContent] = useState<Record<string, SiteContent>>(defaultContent);
  const [metrics, setMetrics] = useState({ advertisers: 0, campaigns: 0, events: 0 });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch site content
      try {
        const { data: contentData } = await supabase.from("site_content").select("section_key, title, subtitle, content, is_visible");
        if (contentData) {
          const mapped: Record<string, SiteContent> = { ...defaultContent };
          contentData.forEach((item: SiteContent) => {
            mapped[item.section_key] = item;
          });
          setContent(mapped);
        }
      } catch (e) {
        console.log("Supabase error (using defaults):", e);
      }

      // Fetch real metrics
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
    fetchData();
  }, []);

  const s = (key: string) => content[key] || defaultContent[key];

  const features = [
    { icon: BarChart3, title: "Real-Time Analytics", desc: "Track every event as it happens across web and mobile platforms" },
    { icon: DollarSign, title: "Milestone Billing", desc: "Charge per download, signup, or purchase with no double counting" },
    { icon: Shield, title: "Fraud Detection", desc: "IP-based rate limiting and pattern detection built in from day one" },
    { icon: Zap, title: "Simple API", desc: "One endpoint, three event types. Integrate in minutes, not days" },
  ];

  const steps = (s("how_it_works").content || "").split(/\r?\n|\\n/).filter(Boolean);

  const contactLines = (s("contact").content || "").split(/\r?\n|\\n/).filter(Boolean);
  const contactIcons = [Mail, Phone, MapPin];

  return (
    <div className="relative min-h-screen overflow-x-hidden text-foreground font-sans">
      <LushLandscape />

      {/* Nav */}
      <header className="relative z-20">
        <div className="container flex h-20 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={32} />
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-gradient">Karbali</span>
              </h1>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
              <Link to="#" className="hover:text-foreground transition-colors">Product</Link>
              <Link to="#" className="hover:text-foreground transition-colors">Integrations</Link>
              <Link to="#" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4">
              <Link to="/login">
                <GlassButton variant="ghost" className="text-foreground hover:bg-white/10">Sign In</GlassButton>
              </Link>
              <Link to="/signup">
                <GlassButton variant="glow" className="px-6">Get Started</GlassButton>
              </Link>
            </div>
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      {s("hero").is_visible && (
        <section className="relative z-10 container flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center px-4 mb-20">
          <MotionWrapper>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl leading-tight">
              {s("hero").title}
            </h1>
          </MotionWrapper>
          <MotionWrapper delay={0.15}>
            <p className="mt-8 max-w-2xl text-xl text-muted-foreground/90 font-medium">
              {s("hero").subtitle}
            </p>
          </MotionWrapper>
          <MotionWrapper delay={0.3}>
            <div className="mt-12 flex flex-col sm:flex-row items-center gap-6">
              <Link to="/signup">
                <GlassButton size="lg" variant="glow" className="px-10 h-14 text-lg">
                  Start Free <ArrowRight className="ml-2 h-4 w-4" />
                </GlassButton>
              </Link>
              <Link to="/docs">
                <GlassButton size="lg" variant="outline" className="px-10 h-14 text-lg border-white/20 bg-white/5 hover:bg-white/10">
                  View API Docs
                </GlassButton>
              </Link>
            </div>
          </MotionWrapper>

          {/* Floating Feature Pills */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute top-[20%] left-[10%] px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm font-medium shadow-2xl"
            >
              ✨ Real-time Tracking
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="absolute top-[30%] right-[15%] px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm font-medium shadow-2xl"
            >
              🛡️ Fraud Prevention
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute bottom-[25%] left-[15%] px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm font-medium shadow-2xl"
            >
              📈 Growth Analytics
            </motion.div>
          </div>
        </section>
      )}

      {/* About & Stats */}
      {s("about").is_visible && (
        <section className="relative z-10 py-24 px-4 bg-background/40 backdrop-blur-xl">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <MotionWrapper>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">{s("about").title}</h2>
                <p className="text-xl text-muted-foreground mb-4">{s("about").subtitle}</p>
                <p className="text-muted-foreground/80 leading-relaxed">{s("about").content}</p>
              </MotionWrapper>

              <MotionStagger className="grid grid-cols-2 gap-6">
                <MotionItem>
                  <GlassCard className="p-8 text-center" variant="strong">
                    <Users className="h-8 w-8 mx-auto mb-4 text-primary" />
                    <div className="text-3xl font-bold mb-1">
                      {metricsLoading ? "..." : metrics.advertisers < 10 ? "Calculating" : metrics.advertisers}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Advertisers</div>
                  </GlassCard>
                </MotionItem>
                <MotionItem>
                  <GlassCard className="p-8 text-center" variant="strong">
                    <Target className="h-8 w-8 mx-auto mb-4 text-primary" />
                    <div className="text-3xl font-bold mb-1">
                      {metricsLoading ? "..." : metrics.campaigns < 10 ? "Calculating" : metrics.campaigns}
                    </div>
                    <div className="text-sm text-muted-foreground">Live Campaigns</div>
                  </GlassCard>
                </MotionItem>
                <MotionItem>
                  <GlassCard className="p-8 text-center col-span-2" variant="glow">
                    <TrendingUp className="h-8 w-8 mx-auto mb-4 text-white" />
                    <div className="text-3xl font-bold mb-1 text-white">
                      {metricsLoading ? "..." : metrics.events < 10 ? "Calculating" : metrics.events}
                    </div>
                    <div className="text-sm text-white/80">Events Tracked</div>
                  </GlassCard>
                </MotionItem>
              </MotionStagger>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      {s("features").is_visible && (
        <section className="relative z-10 py-24 px-4">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{s("features").title}</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{s("features").subtitle}</p>
            </div>
            <MotionStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <MotionItem key={i}>
                  <GlassCard className="p-8 h-full hover:translate-y-[-4px] transition-transform duration-300">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                      <f.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                  </GlassCard>
                </MotionItem>
              ))}
            </MotionStagger>
          </div>
        </section>
      )}

      {/* How it Works */}
      {s("how_it_works").is_visible && (
        <section className="relative z-10 py-24 px-4 bg-primary/5">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{s("how_it_works").title}</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{s("how_it_works").subtitle}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, i) => {
                const [title, ...rest] = step.split(":");
                return (
                  <MotionWrapper key={i} delay={i * 0.1}>
                    <div className="relative p-6">
                      <div className="text-6xl font-black text-primary/10 absolute -top-4 -left-2 select-none">0{i+1}</div>
                      <h3 className="text-xl font-bold mb-3 relative z-10">{title.replace(/^\d+\.\s*/, "")}</h3>
                      <p className="text-muted-foreground text-sm relative z-10">{rest.join(":").trim()}</p>
                    </div>
                  </MotionWrapper>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      {s("contact").is_visible && (
        <section className="relative z-10 py-24 px-4">
          <div className="container">
            <GlassCard className="max-w-4xl mx-auto p-12 overflow-hidden" variant="strong">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h2 className="text-3xl font-bold mb-6">{s("contact").title}</h2>
                  <p className="text-muted-foreground mb-8">{s("contact").subtitle}</p>
                  <div className="space-y-6">
                    {contactLines.map((line, i) => {
                      const Icon = contactIcons[i] || Mail;
                      return (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <span className="text-sm font-medium">{line.split(":")[1]?.trim() || line}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
                  <h3 className="text-xl font-bold mb-4">Send us a message</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
                      <input type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" placeholder="you@company.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message</label>
                      <textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" placeholder="How can we help?"></textarea>
                    </div>
                    <GlassButton className="w-full" variant="glow">Send Message</GlassButton>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>
      )}

      {/* Footer */}
      {s("footer").is_visible && (
        <footer className="relative z-10 border-t border-border/30 py-8 px-4 sm:px-6">
          <div className="container">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="flex items-center gap-2">
                <Logo size={20} />
                <span className="font-bold text-gradient">{s("footer").title}</span>
              </div>
              <p className="text-sm text-muted-foreground">{s("footer").content}</p>
              <p className="text-xs text-muted-foreground/50">
                &copy; {new Date().getFullYear()} Karbali. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
