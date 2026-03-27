import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { BarChart3, Shield, Zap, DollarSign, ArrowRight, Users, Target, TrendingUp, Mail, Phone, MapPin, Sun, Moon } from "lucide-react";
import Logo from "@/components/Logo";
import { useTheme } from "@/lib/theme";
import MigrationAnimation from "@/components/MigrationAnimation";

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
      const { data: contentData } = await supabase.from("site_content").select("section_key, title, subtitle, content, is_visible");
      if (contentData) {
        const mapped: Record<string, SiteContent> = { ...defaultContent };
        contentData.forEach((item: SiteContent) => {
          mapped[item.section_key] = item;
        });
        setContent(mapped);
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
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <FluidCanvas />

      {/* Nav */}
      <header className="relative z-10 border-b border-border/30">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-gradient">Karbali</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <Link to="/login"><GlassButton variant="ghost">Sign In</GlassButton></Link>
              <Link to="/signup"><GlassButton variant="glow">Get Started</GlassButton></Link>
            </div>
            <Link to="/login" className="sm:hidden">
              <GlassButton variant="glow" size="sm">Sign In</GlassButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      {s("hero").is_visible && (
        <section className="relative z-10 container py-16 md:py-28 px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <MotionWrapper>
                <h1 className="max-w-3xl">
                  {s("hero").title}
                </h1>
              </MotionWrapper>
              <MotionWrapper delay={0.15}>
                <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                  {s("hero").subtitle}
                </p>
              </MotionWrapper>
              <MotionWrapper delay={0.3}>
                <div className="mt-10 flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                  <Link to="/signup" className="w-full sm:w-auto">
                    <GlassButton size="lg" variant="glow" className="w-full sm:w-auto px-8">
                      Start Free <ArrowRight className="ml-2 h-4 w-4" />
                    </GlassButton>
                  </Link>
                  <Link to="/docs" className="w-full sm:w-auto">
                    <GlassButton size="lg" variant="outline" className="w-full sm:w-auto px-8">View API Docs</GlassButton>
                  </Link>
                </div>
              </MotionWrapper>

              {/* Stats bar */}
              <MotionWrapper delay={0.45}>
                <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4 border-t border-border/30 pt-8">
                  {[
                    { icon: Users, label: "Active Advertisers", value: metrics.advertisers, raw: "500+" },
                    { icon: Target, label: "Campaigns Tracked", value: metrics.campaigns, raw: "2,000+" },
                    { icon: TrendingUp, label: "Events Processed", value: metrics.events, raw: "10M+" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center lg:text-left">
                      <stat.icon className="mx-auto lg:mx-0 mb-2 h-5 w-5 text-primary" />
                      <p className="text-2xl font-bold text-foreground">
                        {metricsLoading ? "..." : stat.value >= 10 ? stat.value.toLocaleString() : "Calculating"}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </MotionWrapper>
            </div>

            <MotionWrapper delay={0.2} className="relative">
              <div className="relative z-10 rounded-[2.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-2xl">
                <MigrationAnimation />

                {/* Decorative elements */}
                <div className="absolute -top-6 -right-6 h-24 w-24 bg-primary/20 blur-3xl rounded-full" />
                <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-primary/10 blur-3xl rounded-full" />
              </div>
            </MotionWrapper>
          </div>
        </section>
      )}

      {/* About */}
      {s("about").is_visible && (
        <section id="about" className="relative z-10 border-t border-border/30 py-20 px-4 sm:px-6">
          <div className="container">
            <MotionWrapper>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="mb-4">{s("about").title}</h2>
                <p className="mb-6 text-lg text-muted-foreground">{s("about").subtitle}</p>
                <p className="text-muted-foreground/80">{s("about").content}</p>
              </div>
            </MotionWrapper>
          </div>
        </section>
      )}

      {/* How It Works */}
      {s("how_it_works").is_visible && (
        <section id="how-it-works" className="relative z-10 border-t border-border/30 py-20 px-4 sm:px-6">
          <div className="container">
            <MotionWrapper>
              <h2 className="mb-4 text-center">{s("how_it_works").title}</h2>
              <p className="mb-12 text-center text-muted-foreground">{s("how_it_works").subtitle}</p>
            </MotionWrapper>
            <MotionStagger className="mx-auto grid max-w-3xl gap-6 grid-cols-1 md:grid-cols-2">
              {steps.map((step, i) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const title = parts[0] || step;
                const desc = parts.slice(1).join(": ") || "";
                return (
                  <MotionItem key={i}>
                    <GlassCard className="glass-hover h-full p-6">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold">
                        {i + 1}
                      </div>
                      <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </GlassCard>
                  </MotionItem>
                );
              })}
            </MotionStagger>
          </div>
        </section>
      )}

      {/* Features */}
      {s("features").is_visible && (
        <section id="features" className="relative z-10 border-t border-border/30 py-20 px-4 sm:px-6">
          <div className="container">
            <MotionWrapper>
              <h2 className="mb-4 text-center">{s("features").title}</h2>
              <p className="mb-12 text-center text-muted-foreground">{s("features").subtitle}</p>
            </MotionWrapper>
            <MotionStagger className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <MotionItem key={f.title}>
                  <GlassCard className="glass-hover h-full p-6">
                    <f.icon className="mb-4 h-8 w-8 text-foreground" />
                    <h3 className="mb-2 font-semibold text-foreground">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </GlassCard>
                </MotionItem>
              ))}
            </MotionStagger>
          </div>
        </section>
      )}

      {/* Contact */}
      {s("contact").is_visible && (
        <section id="contact" className="relative z-10 border-t border-border/30 py-20 px-4 sm:px-6">
          <div className="container">
            <MotionWrapper>
              <div className="mx-auto max-w-xl text-center">
                <h2 className="mb-4">{s("contact").title}</h2>
                <p className="mb-8 text-muted-foreground">{s("contact").subtitle}</p>
                <div className="space-y-4">
                  {contactLines.map((line, i) => {
                    const Icon = contactIcons[i] || Mail;
                    return (
                      <div key={i} className="flex items-center justify-center gap-3 text-muted-foreground">
                        <Icon className="h-4 w-4 text-primary" />
                        <span>{line.replace(/^(Email|Phone|Address):\s*/, "")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </MotionWrapper>
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
