import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper from "@/components/MotionWrapper";
import { BarChart3, Shield, Zap, DollarSign, ArrowRight, Users, Target, TrendingUp, Mail, Phone, MapPin, Sun, Moon, CheckCircle2 } from "lucide-react";
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
  hero: { section_key: "hero", title: "Migrate Customers to Your Brand", subtitle: "The customer acquisition platform that helps advertisers acquire competitors' customers and only pay for real results.", content: null, is_visible: true },
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
    { icon: BarChart3, title: "Real-Time Analytics", desc: "Track every event as it happens across web and mobile platforms." },
    { icon: DollarSign, title: "Milestone Billing", desc: "Charge per download, signup, or purchase with no double counting." },
    { icon: Shield, title: "Fraud Detection", desc: "IP-based rate limiting and pattern detection built in from day one." },
    { icon: Zap, title: "Simple API", desc: "One endpoint, three event types. Integrate in minutes, not days." },
  ];

  const steps = (s("how_it_works").content || "").split(/\r?\n|\\n/).filter(Boolean);

  const contactLines = (s("contact").content || "").split(/\r?\n|\\n/).filter(Boolean);
  const contactIcons = [Mail, Phone, MapPin];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <FluidCanvas />

      {/* Nav */}
      <header className="relative z-10 border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="text-xl font-bold tracking-tight text-gradient">Karbali</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-muted-foreground hover:text-foreground transition-colors"
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
        <section className="relative z-10 container py-16 md:py-24 px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <MotionWrapper>
                <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight text-foreground">
                  {s("hero").title}
                </h1>
              </MotionWrapper>
              <MotionWrapper delay={0.15}>
                <p className="mt-6 max-w-lg text-lg text-muted-foreground leading-relaxed mx-auto lg:mx-0">
                  {s("hero").subtitle}
                </p>
              </MotionWrapper>
              <MotionWrapper delay={0.3}>
                <div className="mt-8 flex flex-col sm:flex-row justify-center lg:justify-start gap-3">
                  <Link to="/signup">
                    <GlassButton size="lg" variant="glow" className="px-8">
                      Start Free <ArrowRight className="ml-2 h-4 w-4" />
                    </GlassButton>
                  </Link>
                  <Link to="/docs">
                    <GlassButton size="lg" variant="outline" className="px-8">View API Docs</GlassButton>
                  </Link>
                </div>
              </MotionWrapper>
            </div>

            <MotionWrapper delay={0.2}>
              <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden shadow-xl">
                <MigrationAnimation />
              </div>
            </MotionWrapper>
          </div>

          {/* Stats */}
          <MotionWrapper delay={0.45}>
            <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-0 border border-border/40 rounded-2xl overflow-hidden bg-card/30">
              {[
                { icon: Users, label: "Active Advertisers", value: metrics.advertisers },
                { icon: Target, label: "Campaigns Tracked", value: metrics.campaigns },
                { icon: TrendingUp, label: "Events Processed", value: metrics.events },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`flex items-center gap-4 px-6 py-6 ${i < 2 ? "sm:border-r border-b sm:border-b-0 border-border/40" : ""}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {metricsLoading ? "..." : stat.value >= 10 ? stat.value.toLocaleString() : "Calculating"}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </MotionWrapper>
        </section>
      )}

      {/* About */}
      {s("about").is_visible && (
        <section className="relative z-10 py-20 px-4 sm:px-6 bg-card/30 border-y border-border/30">
          <div className="container grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <MotionWrapper>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">About Us</p>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{s("about").title}</h2>
                <p className="text-lg text-muted-foreground mb-6">{s("about").subtitle}</p>
              </div>
            </MotionWrapper>
            <MotionWrapper delay={0.15}>
              <div className="rounded-2xl border border-border/40 bg-background p-8">
                <p className="text-muted-foreground leading-relaxed">{s("about").content}</p>
                <ul className="mt-6 space-y-3">
                  {["No wasted ad spend", "Measurable outcomes only", "Transparent attribution"].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </MotionWrapper>
          </div>
        </section>
      )}

      {/* How It Works */}
      {s("how_it_works").is_visible && (
        <section className="relative z-10 py-20 px-4 sm:px-6">
          <div className="container">
            <MotionWrapper>
              <div className="text-center mb-14">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Process</p>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{s("how_it_works").title}</h2>
                <p className="text-muted-foreground max-w-lg mx-auto">{s("how_it_works").subtitle}</p>
              </div>
            </MotionWrapper>
            <div className="mx-auto max-w-3xl grid gap-4 grid-cols-1 md:grid-cols-2">
              {steps.map((step, i) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const title = parts[0] || step;
                const desc = parts.slice(1).join(": ") || "";
                return (
                  <MotionWrapper key={i} delay={i * 0.1}>
                    <div className="rounded-2xl border border-border/40 bg-card/50 p-6 h-full">
                      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                        {i + 1}
                      </div>
                      <h3 className="mb-1.5 font-semibold text-foreground">{title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </MotionWrapper>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      {s("features").is_visible && (
        <section className="relative z-10 py-20 px-4 sm:px-6 bg-card/30 border-y border-border/30">
          <div className="container">
            <MotionWrapper>
              <div className="text-center mb-14">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Features</p>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{s("features").title}</h2>
                <p className="text-muted-foreground max-w-lg mx-auto">{s("features").subtitle}</p>
              </div>
            </MotionWrapper>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f, i) => (
                <MotionWrapper key={f.title} delay={i * 0.08}>
                  <div className="rounded-2xl border border-border/40 bg-background p-6 h-full">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-1.5 font-semibold text-foreground">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </MotionWrapper>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      {s("contact").is_visible && (
        <section className="relative z-10 py-20 px-4 sm:px-6">
          <div className="container">
            <MotionWrapper>
              <div className="mx-auto max-w-xl text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Contact</p>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{s("contact").title}</h2>
                <p className="mb-10 text-muted-foreground">{s("contact").subtitle}</p>
                <div className="inline-flex flex-col gap-4 text-left">
                  {contactLines.map((line, i) => {
                    const Icon = contactIcons[i] || Mail;
                    return (
                      <div key={i} className="flex items-center gap-3 text-muted-foreground">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm">{line.replace(/^(Email|Phone|Address):\s*/, "")}</span>
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
        <footer className="relative z-10 border-t border-border/40 py-8 px-4 sm:px-6 bg-card/20">
          <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2.5">
              <Logo size={20} />
              <span className="font-bold text-gradient">{s("footer").title}</span>
            </div>
            <p className="text-sm text-muted-foreground">{s("footer").content}</p>
            <p className="text-xs text-muted-foreground/60">
              &copy; {new Date().getFullYear()} Karbali. All rights reserved.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
