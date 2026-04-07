import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper from "@/components/MotionWrapper";
import { ArrowRight, Users, Target, TrendingUp, Sun, Moon } from "lucide-react";
import Logo from "@/components/Logo";
import { useTheme } from "@/lib/theme";
import heroIllustration from "@/assets/hero-illustration.png";

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

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <FluidCanvas />

      {/* Nav */}
      <header className="relative z-10 border-b border-border/30">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-xl font-bold tracking-tight text-gradient">Karbali</span>
          </Link>
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
        <section className="relative z-10 container px-4 sm:px-6 pt-12 md:pt-20 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Text */}
            <div className="text-center lg:text-left">
              <MotionWrapper>
                <h1 className="text-4xl md:text-5xl xl:text-[3.5rem] font-bold leading-[1.08] tracking-tight text-foreground">
                  {s("hero").title}
                </h1>
              </MotionWrapper>
              <MotionWrapper delay={0.15}>
                <p className="mt-5 max-w-lg text-base md:text-lg text-muted-foreground leading-relaxed mx-auto lg:mx-0">
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

            {/* Right: Hero illustration */}
            <MotionWrapper delay={0.2}>
              <div className="relative">
                <img
                  src={heroIllustration}
                  alt="Karbali platform — migrate customers from competitor brands to your brand"
                  className="w-full rounded-2xl shadow-2xl border border-border/30"
                  loading="eager"
                />
              </div>
            </MotionWrapper>
          </div>
        </section>
      )}

      {/* Stats bar */}
      <section className="relative z-10 container px-4 sm:px-6 pb-16">
        <MotionWrapper delay={0.4}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 pt-8">
            {[
              { icon: Users, label: "Active Advertisers", value: metrics.advertisers },
              { icon: Target, label: "Campaigns Tracked", value: metrics.campaigns },
              { icon: TrendingUp, label: "Events Processed", value: metrics.events },
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
      </section>

      {/* Footer */}
      {s("footer").is_visible && (
        <footer className="relative z-10 border-t border-border/30 py-8 px-4 sm:px-6">
          <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Logo size={20} />
              <span className="font-bold text-gradient">{s("footer").title}</span>
            </div>
            <p className="text-sm text-muted-foreground">{s("footer").content}</p>
            <p className="text-xs text-muted-foreground/50">
              &copy; {new Date().getFullYear()} Karbali. All rights reserved.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
