import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { BarChart3, Shield, Zap, DollarSign, Mail, Phone, MapPin, Sun, Moon, ArrowRight } from "lucide-react";
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

      {/* Header - flat, full-width */}
      <header className="relative z-10 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="container max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo size={28} />
              <span className="text-xl font-bold tracking-tight text-gradient">Karbali</span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={toggleTheme}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/login"><GlassButton variant="ghost" size="sm">Sign In</GlassButton></Link>
                <Link to="/signup"><GlassButton variant="glow" size="sm">Get Started</GlassButton></Link>
              </div>

              <Link to="/login" className="sm:hidden">
                <GlassButton variant="glow" size="sm">Sign In</GlassButton>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      {s("hero").is_visible && (
        <LandingHero
          title={s("hero").title}
          subtitle={s("hero").subtitle}
          metrics={metrics}
          metricsLoading={metricsLoading}
        />
      )}

      {/* About */}
      {s("about").is_visible && (
        <section id="about" className="relative z-10 py-24 px-4 sm:px-6">
          <div className="container max-w-4xl">
            <MotionWrapper>
              <div className="mb-6">
                <div className="futuristic-label mb-6">About</div>
                <h2 className="mb-4 text-foreground">{s("about").title}</h2>
                <p className="mb-6 text-lg text-muted-foreground">{s("about").subtitle}</p>
                <div className="h-px w-24 bg-primary/40" />
                <p className="mt-6 text-muted-foreground/80 leading-7 max-w-2xl">{s("about").content}</p>
              </div>
            </MotionWrapper>
          </div>
        </section>
      )}

      {/* How It Works */}
      {s("how_it_works").is_visible && (
        <section id="how-it-works" className="relative z-10 py-24 px-4 sm:px-6">
          <div className="container max-w-5xl">
            <MotionWrapper>
              <div className="mb-16 text-center">
                <div className="futuristic-label mx-auto mb-4">Process</div>
                <h2 className="mb-4 text-foreground">{s("how_it_works").title}</h2>
                <p className="text-muted-foreground">{s("how_it_works").subtitle}</p>
              </div>
            </MotionWrapper>
            <MotionStagger className="relative mx-auto max-w-3xl">
              {/* Vertical line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent hidden md:block" />
              <div className="space-y-10">
                {steps.map((step, i) => {
                  const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                  const title = parts[0] || step;
                  const desc = parts.slice(1).join(": ") || "";
                  return (
                    <MotionItem key={i}>
                      <div className="flex gap-6 items-start">
                        <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {i + 1}
                        </div>
                        <div className="pt-1.5">
                          <h3 className="mb-1.5 font-semibold text-foreground text-lg">{title}</h3>
                          <p className="text-muted-foreground leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    </MotionItem>
                  );
                })}
              </div>
            </MotionStagger>
          </div>
        </section>
      )}

      {/* Features */}
      {s("features").is_visible && (
        <section id="features" className="relative z-10 py-24 px-4 sm:px-6">
          <div className="container max-w-5xl">
            <MotionWrapper>
              <div className="mb-16 text-center">
                <div className="futuristic-label mx-auto mb-4">Capabilities</div>
                <h2 className="mb-4 text-foreground">{s("features").title}</h2>
                <p className="text-muted-foreground">{s("features").subtitle}</p>
              </div>
            </MotionWrapper>
            <MotionStagger className="grid gap-x-12 gap-y-10 grid-cols-1 md:grid-cols-2">
              {features.map((f) => (
                <MotionItem key={f.title}>
                  <div className="flex gap-5 items-start">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <f.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="mb-1.5 font-semibold text-foreground">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </MotionItem>
              ))}
            </MotionStagger>
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="relative z-10 py-20 px-4 sm:px-6">
        <div className="container max-w-3xl text-center">
          <MotionWrapper>
            <h2 className="mb-4 text-foreground">Ready to migrate customers?</h2>
            <p className="mb-8 text-muted-foreground max-w-lg mx-auto">Join the next generation of performance-driven advertisers.</p>
            <Link to="/signup">
              <GlassButton size="lg" variant="glow" className="px-10">
                Get Started Now <ArrowRight className="h-4 w-4" />
              </GlassButton>
            </Link>
          </MotionWrapper>
        </div>
      </section>

      {/* Contact */}
      {s("contact").is_visible && (
        <section id="contact" className="relative z-10 py-24 px-4 sm:px-6">
          <div className="container max-w-xl text-center">
            <MotionWrapper>
              <div className="futuristic-label mx-auto mb-4">Contact</div>
              <h2 className="mb-4 text-foreground">{s("contact").title}</h2>
              <p className="mb-8 text-muted-foreground">{s("contact").subtitle}</p>
              <div className="space-y-4">
                {contactLines.map((line, i) => {
                  const Icon = contactIcons[i] || Mail;
                  return (
                    <div key={i} className="flex items-center justify-center gap-3">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">{line.replace(/^(Email|Phone|Address):\s*/, "")}</span>
                    </div>
                  );
                })}
              </div>
            </MotionWrapper>
          </div>
        </section>
      )}

      {/* Footer */}
      {s("footer").is_visible && (
        <footer className="relative z-10 border-t border-border/50 py-8 px-4 sm:px-6">
          <div className="container max-w-7xl">
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
