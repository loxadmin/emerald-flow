import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import MotionWrapper from "@/components/MotionWrapper";
import LandingHeroVisual from "@/components/LandingHeroVisual";
import {
  ArrowRight,
  Users,
  Target,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Sun,
  Moon,
  BarChart3,
  Shield,
  Zap,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import Logo from "@/components/Logo";
import { useTheme } from "@/lib/theme";

interface SiteContent {
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  is_visible: boolean;
}

const defaultContent: Record<string, SiteContent> = {
  hero: {
    section_key: "hero",
    title: "Migrate Customers to Your Brand",
    subtitle:
      "The customer acquisition platform that helps advertisers acquire competitors' customers and only pay for real results.",
    content: null,
    is_visible: true,
  },
  about: {
    section_key: "about",
    title: "About Karbali",
    subtitle:
      "We built Karbali to solve a simple problem: advertisers waste money on clicks and impressions that never convert.",
    content:
      "Karbali is a performance-based attribution platform. We connect advertisers with real users and charge only for measurable outcomes like downloads, signups, and purchases. No wasted ad spend. No guesswork. Just results.",
    is_visible: true,
  },
  how_it_works: {
    section_key: "how_it_works",
    title: "How It Works",
    subtitle: "From campaign creation to verified results in four simple steps.",
    content:
      "1. Create a Campaign: Set your budget and define what you will pay for.\n2. Integrate Our API: Add a simple tracking snippet to your app.\n3. Get Approved: Our team verifies your integration.\n4. Track and Pay for Results: Only pay when users take action.",
    is_visible: true,
  },
  features: {
    section_key: "features",
    title: "Why Choose Karbali",
    subtitle:
      "Built for performance-driven advertisers who demand transparency.",
    content: null,
    is_visible: true,
  },
  contact: {
    section_key: "contact",
    title: "Get in Touch",
    subtitle: "Have questions? We would love to hear from you.",
    content: "Email: support@karbali.com\nPhone: +1 (555) 123-4567\nAddress: Lagos, Nigeria",
    is_visible: true,
  },
  footer: {
    section_key: "footer",
    title: "Karbali",
    subtitle: null,
    content: "Performance Attribution Platform. Track real outcomes, not vanity metrics.",
    is_visible: true,
  },
};

const features = [
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    desc: "Track every event as it happens across web and mobile platforms.",
  },
  {
    icon: DollarSign,
    title: "Milestone Billing",
    desc: "Charge per download, signup, or purchase with no double counting.",
  },
  {
    icon: Shield,
    title: "Fraud Detection",
    desc: "IP-based rate limiting and pattern detection built in from day one.",
  },
  {
    icon: Zap,
    title: "Simple API",
    desc: "One endpoint, three event types. Integrate in minutes, not days.",
  },
];

export default function Index() {
  const [content, setContent] = useState<Record<string, SiteContent>>(defaultContent);
  const [metrics, setMetrics] = useState({ advertisers: 0, campaigns: 0, events: 0 });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: contentData } = await supabase
          .from("site_content")
          .select("section_key, title, subtitle, content, is_visible");

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
          supabase.from("events").select("id", { count: "exact", head: true }),
        ]);

        setMetrics({
          advertisers: advRes.count || 0,
          campaigns: campRes.count || 0,
          events: eventRes.count || 0,
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
  const steps = (s("how_it_works").content || "").split(/\r?\n|\\n/).filter(Boolean);
  const contactLines = (s("contact").content || "").split(/\r?\n|\\n/).filter(Boolean);
  const contactIcons = [Mail, Phone, MapPin];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 16% 18%, hsl(var(--primary) / 0.16), transparent 0 20%),
              radial-gradient(circle at 76% 16%, hsl(var(--primary) / 0.12), transparent 0 26%),
              radial-gradient(circle at 48% 46%, hsl(var(--primary) / 0.05), transparent 0 20%),
              linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 72%, hsl(var(--card)) 100%)
            `,
          }}
        />
        <div
          className="absolute -left-[12%] top-[35%] h-[26rem] w-[26rem] rounded-full blur-3xl"
          style={{ background: "hsl(var(--primary) / 0.08)" }}
        />
        <div
          className="absolute inset-x-[-8%] bottom-[-18%] h-[24rem] rounded-[50%]"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--primary) / 0.04) 0%, hsl(var(--primary) / 0.12) 100%)",
          }}
        />
      </div>

      <header className="relative z-10 border-b border-border/20">
        <div className="container flex h-20 items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={34} />
            <span className="text-3xl font-bold tracking-tight text-gradient">Karbali</span>
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/login" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex">
              Sign In
            </Link>
            <Link to="/signup">
              <GlassButton variant="glow" size="lg" className="px-7 sm:px-9">
                Get Started
              </GlassButton>
            </Link>
          </div>
        </div>
      </header>

      {s("hero").is_visible && (
        <section className="relative z-10 container px-4 pb-10 pt-10 sm:px-6 md:pb-14 md:pt-14">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-12">
            <div className="max-w-[40rem] text-center lg:text-left">
              <MotionWrapper>
                <h1 className="text-balance text-[3.5rem] font-bold leading-[0.96] tracking-[-0.04em] text-foreground sm:text-[4.35rem] lg:text-[5rem]">
                  {s("hero").title}
                </h1>
              </MotionWrapper>

              <MotionWrapper delay={0.12}>
                <p className="mt-6 max-w-[36rem] text-lg leading-relaxed text-muted-foreground sm:text-[1.55rem] lg:mx-0 lg:text-[1.15rem]">
                  {s("hero").subtitle}
                </p>
              </MotionWrapper>

              <MotionWrapper delay={0.24}>
                <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                  <Link to="/signup">
                    <GlassButton variant="glow" size="lg" className="min-w-[13rem] rounded-2xl px-8">
                      Start Free <ArrowRight className="ml-1 h-4 w-4" />
                    </GlassButton>
                  </Link>
                  <Link to="/docs">
                    <GlassButton variant="outline" size="lg" className="min-w-[13rem] rounded-2xl border-border/40 bg-background/10 px-8 backdrop-blur-sm">
                      View API Docs
                    </GlassButton>
                  </Link>
                </div>
              </MotionWrapper>
            </div>

            <MotionWrapper delay={0.16}>
              <LandingHeroVisual />
            </MotionWrapper>
          </div>
        </section>
      )}

      <section className="relative z-10 container px-4 pb-20 sm:px-6 md:pb-24">
        <MotionWrapper delay={0.28}>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {[
              { icon: Users, label: "Active Advertisers", value: metrics.advertisers },
              { icon: Target, label: "Campaigns Tracked", value: metrics.campaigns },
              { icon: TrendingUp, label: "Events Processed", value: metrics.events },
            ].map((stat) => (
              <div key={stat.label} className="text-center md:text-left">
                <div className="mb-4 flex justify-center md:justify-start">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <p className="text-3xl font-bold tracking-tight text-foreground">
                  {metricsLoading ? "..." : stat.value >= 10 ? stat.value.toLocaleString() : "Calculating"}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </MotionWrapper>
      </section>

      {s("about").is_visible && (
        <section className="relative z-10 border-t border-border/20 px-4 py-20 sm:px-6">
          <div className="container grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <MotionWrapper>
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-primary">About</p>
                <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{s("about").title}</h2>
                <p className="mt-4 text-lg text-muted-foreground">{s("about").subtitle}</p>
              </div>
            </MotionWrapper>
            <MotionWrapper delay={0.12}>
              <div className="rounded-[1.75rem] border border-border/25 bg-card/35 p-8 backdrop-blur-sm">
                <p className="text-base leading-8 text-muted-foreground">{s("about").content}</p>
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {[
                    "No wasted ad spend",
                    "Verified outcomes only",
                    "Transparent attribution",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-border/20 bg-background/35 p-4">
                      <CheckCircle2 className="mb-3 h-5 w-5 text-primary" />
                      <p className="text-sm font-medium text-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </MotionWrapper>
          </div>
        </section>
      )}

      {s("how_it_works").is_visible && (
        <section className="relative z-10 border-t border-border/20 px-4 py-20 sm:px-6">
          <div className="container">
            <MotionWrapper>
              <div className="mx-auto max-w-2xl text-center">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-primary">Workflow</p>
                <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{s("how_it_works").title}</h2>
                <p className="mt-4 text-muted-foreground">{s("how_it_works").subtitle}</p>
              </div>
            </MotionWrapper>
            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {steps.map((step, index) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const title = parts[0] || step;
                const desc = parts.slice(1).join(": ") || "";

                return (
                  <MotionWrapper key={step} delay={index * 0.08}>
                    <div className="h-full rounded-[1.6rem] border border-border/25 bg-card/30 p-6 backdrop-blur-sm">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{desc}</p>
                    </div>
                  </MotionWrapper>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {s("features").is_visible && (
        <section className="relative z-10 border-t border-border/20 px-4 py-20 sm:px-6">
          <div className="container">
            <MotionWrapper>
              <div className="mx-auto max-w-2xl text-center">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-primary">Features</p>
                <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{s("features").title}</h2>
                <p className="mt-4 text-muted-foreground">{s("features").subtitle}</p>
              </div>
            </MotionWrapper>
            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {features.map((feature, index) => (
                <MotionWrapper key={feature.title} delay={index * 0.08}>
                  <div className="h-full rounded-[1.6rem] border border-border/25 bg-card/30 p-6 backdrop-blur-sm">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.desc}</p>
                  </div>
                </MotionWrapper>
              ))}
            </div>
          </div>
        </section>
      )}

      {s("contact").is_visible && (
        <section className="relative z-10 border-t border-border/20 px-4 py-20 sm:px-6">
          <div className="container">
            <MotionWrapper>
              <div className="mx-auto max-w-2xl text-center">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-primary">Contact</p>
                <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{s("contact").title}</h2>
                <p className="mt-4 text-muted-foreground">{s("contact").subtitle}</p>
              </div>
            </MotionWrapper>
            <MotionWrapper delay={0.12}>
              <div className="mx-auto mt-10 max-w-xl rounded-[1.75rem] border border-border/25 bg-card/30 p-8 backdrop-blur-sm">
                <div className="space-y-4">
                  {contactLines.map((line, index) => {
                    const Icon = contactIcons[index] || Mail;
                    return (
                      <div key={line} className="flex items-center gap-4 rounded-2xl border border-border/20 bg-background/30 px-4 py-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm text-foreground/90">
                          {line.replace(/^(Email|Phone|Address):\s*/, "")}
                        </span>
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
        <footer className="relative z-10 border-t border-border/20 px-4 py-8 sm:px-6">
          <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={20} />
              <span className="font-bold text-gradient">{s("footer").title}</span>
            </Link>
            <p className="text-center text-sm text-muted-foreground md:text-left">{s("footer").content}</p>
            <p className="text-xs text-muted-foreground/60">&copy; {new Date().getFullYear()} Karbali. All rights reserved.</p>
          </div>
        </footer>
      )}
    </div>
  );
}
