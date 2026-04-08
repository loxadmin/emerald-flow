import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { BarChart3, Shield, Zap, DollarSign, Mail, Phone, MapPin, Sun, Moon } from "lucide-react";
import Logo from "@/components/Logo";
import { useTheme } from "@/lib/theme";
import LandingHero from "@/components/landing/LandingHero";

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

      <header className="relative z-10 px-4 pt-4 sm:px-6">
        <div className="container">
          <div className="flex h-16 items-center justify-between rounded-full border border-border/25 bg-background/40 px-4 backdrop-blur-sm sm:px-6">
            <Link to="/" className="flex items-center gap-3">
              <Logo size={28} />
              <h1 className="text-xl font-bold tracking-tight">
                <span className="text-gradient">Karbali</span>
              </h1>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={toggleTheme}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <div className="hidden items-center gap-3 sm:flex">
                <Link to="/login"><GlassButton variant="ghost">Sign In</GlassButton></Link>
                <Link to="/signup"><GlassButton variant="glow">Get Started</GlassButton></Link>
              </div>

              <Link to="/login" className="sm:hidden">
                <GlassButton variant="glow" size="sm">Sign In</GlassButton>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {s("hero").is_visible && (
        <LandingHero
          title={s("hero").title}
          subtitle={s("hero").subtitle}
          metrics={metrics}
          metricsLoading={metricsLoading}
        />
      )}

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
                    <GlassCard className="h-full p-6">
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
                  <GlassCard className="h-full p-6">
                    <f.icon className="mb-4 h-8 w-8 text-primary" />
                    <h3 className="mb-2 font-semibold text-foreground">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </GlassCard>
                </MotionItem>
              ))}
            </MotionStagger>
          </div>
        </section>
      )}

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
