import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import { Button } from "@/components/ui/button";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { BarChart3, Shield, Zap, DollarSign, Sun, Moon, ArrowRight, Send, Terminal, CheckCircle2, Mail, MapPin, Globe, Menu, X } from "lucide-react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { useTheme } from "@/lib/theme";
import { Helmet } from "react-helmet-async";
import LandingHero from "@/components/landing/LandingHero";
import LandingVariant1 from "@/components/landing/LandingVariant1";
import LandingVariant2 from "@/components/landing/LandingVariant2";
import LandingVariant3 from "@/components/landing/LandingVariant3";
import LandingVariant4 from "@/components/landing/LandingVariant4";
import LandingVariant5 from "@/components/landing/LandingVariant5";
import ModeBanner from "@/components/ModeBanner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ContainerScroll, CardsContainer, CardTransformed } from "@/components/ui/animated-cards-stack";
import { cn } from "@/lib/utils";
import DisplayCards, { DisplayCardProps } from "@/components/ui/display-cards";
import { CpuArchitecture } from "@/components/ui/cpu-architecture";

interface SiteContent {
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  is_visible: boolean;
}

const defaultContent: Record<string, SiteContent> = {
  hero: { section_key: "hero", title: "Get more customers, users, and sales for your business", subtitle: "The performance attribution platform that helps you acquire customers through targeted campaigns and only pay for real results.", content: null, is_visible: true },
  about: { section_key: "about", title: "About Karbali Ads", subtitle: null, content: null, is_visible: true },
  how_it_works: { section_key: "how_it_works", title: "How It Works", subtitle: "From campaign creation to verified results in four simple steps.", content: "1. Create a Campaign: Set your budget and define what you will pay for.\n2. Integrate Our API: Add a simple tracking snippet to your app.\n3. Get Approved: Our admin team verifies your integration and activates your campaign.\n4. Track and Pay for Results: Monitor real-time analytics and only pay when users take action.", is_visible: true },
  features: { section_key: "features", title: "Why Choose Karbali Ads", subtitle: "Built for performance-driven advertisers who demand transparency.", content: null, is_visible: true },
  contact: { section_key: "contact", title: "Get in Touch", subtitle: "Have questions? We would love to hear from you.", content: null, is_visible: true },
  footer: { section_key: "footer", title: "Karbali Ads", subtitle: null, content: "Performance Attribution Platform. Track real outcomes, not vanity metrics.", is_visible: true },
};

export default function Index() {
  const [content, setContent] = useState<Record<string, SiteContent>>(defaultContent);
  const [metrics, setMetrics] = useState({ advertisers: 0, campaigns: 0, events: 0 });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroDesign, setHeroDesign] = useState<string>("default");
  const [activeStep, setActiveStep] = useState<number>(0);
  const { theme, toggleTheme } = useTheme();

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSending, setContactSending] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: contentData } = await supabase.from("site_content").select("section_key, title, subtitle, content, is_visible");
        if (contentData) {
          const mapped: Record<string, SiteContent> = { ...defaultContent };
          contentData.forEach((item: SiteContent) => { mapped[item.section_key] = item; });
          setContent(mapped);
        }
      } catch (e) { console.log("Supabase error (using defaults):", e); }

      try {
        const { data: designData } = await supabase.from("admin_settings").select("value").eq("key", "landing_design").maybeSingle();
        setHeroDesign(typeof designData?.value === "string" ? designData.value : "default");
      } catch (e) { console.log("Design setting error:", e); }

      try {
        const [advRes, campRes, eventRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("campaigns").select("id", { count: "exact", head: true }),
          supabase.from("events").select("id", { count: "exact", head: true })
        ]);
        setMetrics({ advertisers: advRes.count || 0, campaigns: campRes.count || 0, events: eventRes.count || 0 });
      } catch (error) { console.error("Error fetching metrics:", error); }
      finally { setMetricsLoading(false); }
    };
    fetchData();
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      toast.error("Please fill in all fields"); return;
    }
    setContactSending(true);
    const { data: inserted, error } = await supabase.from("contact_messages" as never).insert({ name: contactName.trim(), email: contactEmail.trim(), message: contactMessage.trim() } as never).select("id").single();
    setContactSending(false);
    if (error) { toast.error("Failed to send message. Please try again."); }
    else {
      toast.success("Message sent! We'll get back to you soon.");
      setContactName(""); setContactEmail(""); setContactMessage("");
      supabase.functions.invoke("notify", { body: { event: "support_message", payload: { message_id: (inserted as { id: string })?.id } } }).catch(() => {});
    }
  };

  const s = (key: string) => content[key] || defaultContent[key];

  const variantProps = {
    content,
    metrics,
    metricsLoading,
    onContactSubmit: handleContactSubmit,
    contactName, setContactName,
    contactEmail, setContactEmail,
    contactMessage, setContactMessage,
    contactSending,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Karbali Ads",
    "url": "https://karbali.com",
    "logo": "https://karbali.com/logo.png",
    "description": "Karbali is a customer acquisition and advertising platform that helps businesses get users through targeted campaigns and performance-based marketing.",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Lagos",
      "addressCountry": "Nigeria"
    },
    "sameAs": [
      "https://twitter.com/karbali_ads"
    ]
  };

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Karbali Ads — Customer Acquisition Platform",
    "description": "Karbali Ads helps businesses find customers and get paying clients with performance-based advertising. Pay only for real signups, downloads, and sales.",
    "image": [
      "https://advertiser.karbali.com/og-image.jpg",
      "https://advertiser.karbali.com/icon-512-v4.png"
    ],
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "url": "https://advertiser.karbali.com/",
    "brand": { "@type": "Brand", "name": "Karbali" },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "USD",
      "price": "0",
      "availability": "https://schema.org/InStock",
      "url": "https://advertiser.karbali.com/signup"
    }
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Karbali?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Karbali is a performance advertising platform that helps businesses find customers and get paying clients. Advertisers only pay when real users sign up, download, or buy."
        }
      },
      {
        "@type": "Question",
        "name": "How do I find customers with Karbali Ads?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Create a campaign on Karbali Ads, set a budget, define the action you will pay for (signup, download, or purchase), and Karbali distributes your ads to high-intent users across its network."
        }
      },
      {
        "@type": "Question",
        "name": "How can I get paying clients online?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Use Karbali Ads to run pay-per-result campaigns. You only spend money when a real customer completes the action you want, which makes acquiring paying clients predictable and profitable."
        }
      },
      {
        "@type": "Question",
        "name": "How is Karbali different from Google Ads or Facebook Ads?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Unlike traditional ad platforms that charge per click or impression, Karbali Ads charges per verified outcome. You pay for paying clients, not for traffic."
        }
      }
    ]
  };

  const features = [
    { icon: BarChart3, title: "Real-Time Analytics", desc: "Track every event as it happens across web and mobile platforms" },
    { icon: DollarSign, title: "Milestone Billing", desc: "Charge per download, signup, or purchase with no double counting" },
    { icon: Shield, title: "Fraud Detection", desc: "IP-based rate limiting and pattern detection built in from day one" },
    { icon: Zap, title: "Simple API", desc: "One endpoint, three event types. Integrate in minutes, not days" },
  ];

  const steps = (s("how_it_works").content || "").split(/\r?\n|\\n/).filter(Boolean);
  const cpuTexts = ["CAMPAIGN", "API CODE", "APPROVED", "PAYOUT"];
  const activeCpuText = cpuTexts[activeStep] || "KARBALI";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <Helmet>
        <title>Karbali Ads — Find Customers & Get Paying Clients Online</title>
        <meta name="description" content="Karbali Ads helps you find customers and get paying clients. Run performance ads on Karbali and pay only for real signups, downloads, and sales." />
        <meta name="keywords" content="karbali, karbali ads, ads, find customers, how to get paying clients, customer acquisition, performance ads, get users for app" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <link rel="canonical" href="https://advertiser.karbali.com/" />
        <meta property="og:title" content="Karbali Ads — Find Customers & Get Paying Clients" />
        <meta property="og:description" content="Run performance ads on Karbali. Find customers, get paying clients, pay only for real results." />
        <meta property="og:url" content="https://advertiser.karbali.com/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Karbali Ads — Find Customers & Get Paying Clients" />
        <meta name="twitter:description" content="Run performance ads on Karbali. Find customers, get paying clients, pay only for real results." />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>
      <FluidCanvas />

      {/* Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${scrolled || mobileMenuOpen ? "bg-background/90 backdrop-blur-md border-b border-border py-2" : "bg-transparent py-4"}`}>
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
              <Logo size={22} />
              <span className="text-lg font-bold tracking-tight text-foreground transition-colors">Karbali Ads</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden items-center gap-4 md:flex">
              <Link to="/about" className="text-sm text-muted-foreground transition-colors hover:text-primary">About</Link>
              <Link to="/docs" className="text-sm text-muted-foreground transition-colors hover:text-primary">API</Link>
              <Link to="/blog" className="text-sm text-muted-foreground transition-colors hover:text-primary">Blog</Link>
              <button onClick={toggleTheme} className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-primary" aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link to="/login" className="text-sm font-medium text-foreground transition-colors hover:text-primary">Log in</Link>
              <Link to="/signup">
                <GlassButton variant="default" size="sm">
                  Get Started
                </GlassButton>
              </Link>
            </div>

            {/* Mobile controls */}
            <div className="flex items-center gap-1 md:hidden">
              <button onClick={toggleTheme} className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-primary" aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="rounded-lg p-2 text-foreground transition-colors hover:text-primary"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile menu panel */}
          <div className={`overflow-hidden transition-all duration-300 md:hidden ${mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
            <nav className="flex flex-col gap-1 border-t border-border py-4">
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-secondary">About</Link>
              <Link to="/docs" onClick={() => setMobileMenuOpen(false)} className="rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-secondary">API</Link>
              <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-secondary">Blog</Link>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">Log in</Link>
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="mt-2">
                <GlassButton variant="default" size="sm" className="w-full">
                  Get Started
                </GlassButton>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* If a variant is selected, render the full-page variant */}
      {heroDesign === "variant1" ? <LandingVariant1 {...variantProps} /> :
       heroDesign === "variant2" ? <LandingVariant2 {...variantProps} /> :
       heroDesign === "variant3" ? <LandingVariant3 {...variantProps} /> :
       heroDesign === "variant4" ? <LandingVariant4 {...variantProps} /> :
       heroDesign === "variant5" ? <LandingVariant5 {...variantProps} /> :
       heroDesign === "default" ?
      (
        <>
          {/* Default layout */}
          {s("hero").is_visible && (
            <LandingHero title={s("hero").title} subtitle={s("hero").subtitle} metrics={metrics} metricsLoading={metricsLoading} />
          )}

          {/* Live mode banner — reflects Simple vs Advance across the platform */}
          <section className="relative z-10 py-6">
            <ModeBanner />
          </section>


          {/* Logos / trust band */}
          <section className="relative z-10 border-y border-border bg-card/30 py-10">
            <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
              <p className="eyebrow text-center">Trusted by teams shipping in these industries</p>
              <div className="mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
                <div className="flex w-max animate-marquee gap-x-12 opacity-70">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex shrink-0 items-center gap-x-12 pr-12" aria-hidden={i === 1}>
                      {["Oil and Gas", "Fintech", "Banking and MFBs", "E-commerce & storefronts", "Youtubers & Musicians"].map((c) => (
                        <span key={c} className="text-sm font-medium tracking-tight text-muted-foreground whitespace-nowrap">{c}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Redesigned Feature Section with Animated Cards Stack */}
          <section className="relative z-10 py-12 md:py-16 px-6 sm:px-10 lg:px-16 overflow-hidden">
            <div className="mx-auto max-w-7xl">
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 items-center">

                {/* Left Side: Sticky Headers */}
                <div className="lg:col-span-5 lg:py-6">
                  <span className="eyebrow">Platform</span>
                  <h2 className="display-lg mt-3 text-foreground font-semibold">
                    Everything you need to acquire customers, profitably.
                  </h2>
                  <p className="lede mt-5 text-muted-foreground">
                    A calm, transparent ad platform built for teams that measure what matters. No vanity, no surprises.
                  </p>
                </div>

                {/* Right Side: Animated Cards Stack */}
                <div className="lg:col-span-7 w-full flex justify-center py-6">
                  <ContainerScroll className="w-full max-w-[440px]">
                    <div className="w-full flex items-start justify-center">
                      <CardsContainer className="relative w-full h-[340px] sm:h-[300px]">
                        {features.map((f, index) => (
                          <CardTransformed
                            arrayLength={features.length}
                            key={f.title}
                            variant={theme === "dark" ? "dark" : "light"}
                            index={index + 1}
                            incrementY={12}
                            incrementZ={14}
                            incrementRotation={-5 * (index + 1)}
                            className={cn(
                              "flex flex-col items-center justify-center p-8 text-center rounded-2xl border backdrop-blur-md shadow-2xl transition-all",
                              theme === "dark"
                                ? "bg-card/90 border-border/60 text-foreground"
                                : "bg-card/90 border-border/40 text-foreground"
                            )}
                          >
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-5 shadow-sm">
                              <f.icon className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold tracking-tight text-foreground">{f.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-[280px]">{f.desc}</p>
                          </CardTransformed>
                        ))}
                      </CardsContainer>
                    </div>
                  </ContainerScroll>
                </div>

              </div>
            </div>
          </section>

          {/* How it works — pastel mint band */}
          {s("how_it_works").is_visible && (
            <section id="how-it-works" className="relative z-10 section-mint border-y border-border py-12 md:py-16 px-6 sm:px-10 lg:px-16">
              <div className="mx-auto max-w-7xl">
                <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 items-center">

                  {/* Left Side: Text and Steps */}
                  <div className="lg:col-span-7 space-y-8">
                    <div>
                      <span className="eyebrow">How it works</span>
                      <h2 className="display-lg mt-3 text-foreground font-semibold">{s("how_it_works").title}</h2>
                      <p className="lede mt-5 text-muted-foreground">{s("how_it_works").subtitle}</p>
                    </div>

                    <div className="space-y-4">
                      {steps.map((step, i) => {
                        const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                        const stepTitle = parts[0] || step;
                        const desc = parts.slice(1).join(": ") || "";
                        const icons = [Zap, Terminal, CheckCircle2, BarChart3];
                        const Icon = icons[i] || Zap;
                        const isActive = activeStep === i;

                        return (
                          <div
                            key={i}
                            onMouseEnter={() => setActiveStep(i)}
                            onClick={() => setActiveStep(i)}
                            className={cn(
                              "group flex gap-4 items-start p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none",
                              isActive
                                ? "bg-card/90 border-primary/30 shadow-md scale-[1.01]"
                                : "border-transparent hover:bg-card/40 hover:border-border/50"
                            )}
                          >
                            <div className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 mt-1",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-primary/10 text-primary group-hover:bg-primary/20"
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <h3 className={cn(
                                "text-lg font-semibold tracking-tight transition-colors duration-300 flex items-center justify-between",
                                isActive ? "text-foreground" : "text-foreground/90 group-hover:text-foreground"
                              )}>
                                <span>
                                  <span className="font-mono text-xs text-muted-foreground mr-2">0{i + 1}.</span>
                                  {stepTitle}
                                </span>
                                {isActive && (
                                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                )}
                              </h3>
                              <p className={cn(
                                "mt-1 text-sm transition-colors duration-300 max-w-xl",
                                isActive ? "text-foreground/80 font-medium" : "text-muted-foreground"
                              )}>
                                {desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Side: Redesigned Interactive Layout with CpuArchitecture */}
                  <div className="lg:col-span-5 flex items-center justify-center py-10">
                    <div className="relative w-full max-w-md flex flex-col items-center justify-center">

                      {/* Premium Glassmorphic terminal-style container */}
                      <div className="relative w-full rounded-2xl border border-border/80 bg-card/65 backdrop-blur-xl shadow-xl overflow-hidden p-6 transition-all duration-500 hover:shadow-2xl hover:border-primary/30">

                        {/* Terminal Header */}
                        <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                            <span className="font-mono text-[10px] text-muted-foreground ml-2 tracking-widest uppercase">System Analyzer</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                            <span className="font-mono text-[9px] text-primary font-semibold tracking-wider">LIVE DATA FLOW</span>
                          </div>
                        </div>

                        {/* CPU SVG Component */}
                        <div className="relative w-full aspect-[2/1] flex items-center justify-center py-2 bg-black/5 rounded-lg border border-border/20">
                          <CpuArchitecture
                            text={activeCpuText}
                            className="w-full h-full text-primary/40"
                            animateLines={true}
                            animateMarkers={true}
                          />
                        </div>

                        {/* Dynamic Status panel */}
                        <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 gap-4 font-mono text-[10px]">
                          <div>
                            <span className="text-muted-foreground block uppercase tracking-wider mb-0.5">CURRENT STEP</span>
                            <span className="text-foreground font-semibold uppercase tracking-widest">
                              0{activeStep + 1} // {activeCpuText}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground block uppercase tracking-wider mb-0.5">ALLOCATION STATUS</span>
                            <span className="text-primary font-bold tracking-widest animate-pulse">
                              {activeStep === 0 ? "PREPARING BUDGET" :
                               activeStep === 1 ? "LISTENING FOR EVENTS" :
                               activeStep === 2 ? "SECURELY VERIFIED" :
                               "PAYING ONLY FOR SALES"}
                            </span>
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </section>
          )}

          {/* CTA — ink panel for fintech contrast */}
          <section className="relative z-10 py-24 px-6 sm:px-10 lg:px-16">
            <div className="mx-auto max-w-7xl">
              <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 md:p-16">
                <div aria-hidden className="absolute inset-0 -z-10"
                     style={{ background: "radial-gradient(60% 80% at 90% 0%, hsl(var(--primary)/0.10), transparent 60%), radial-gradient(50% 60% at 0% 100%, hsl(var(--pastel-sky)), transparent 60%)" }} />
                <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
                  <div className="lg:col-span-7">
                    <span className="pill-emerald"><CheckCircle2 className="h-3.5 w-3.5" /> Ready in minutes</span>
                    <h2 className="display-lg mt-5">Stop paying for clicks. Pay for outcomes.</h2>
                    <p className="lede mt-5">Connect your tracking, fund your wallet, launch a campaign. We only charge you when a real customer takes a real action.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 lg:col-span-5 lg:justify-end">
                    <Link to="/signup">
                      <Button size="lg" className="h-12 rounded-full px-7 text-sm font-semibold">Get started <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
                    </Link>
                    <Link to="/docs">
                      <Button size="lg" variant="outline" className="h-12 rounded-full border-border bg-card px-7 text-sm font-semibold">Read the docs</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact — pastel cream band */}
          {s("contact").is_visible && (
            <section id="contact" className="relative z-10 section-cream border-t border-border py-16 md:py-20 px-6 sm:px-10 lg:px-16">
              <div className="mx-auto max-w-6xl">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
                  <div>
                    <span className="eyebrow">Contact</span>
                    <h2 className="display-lg mt-3 text-foreground">{s("contact").title}</h2>
                    <p className="lede mt-5">{s("contact").subtitle}</p>
                    <div className="mt-10 space-y-5">
                      {[
                        { icon: Mail, label: "Email", value: "hello@karbali.com" },
                        { icon: MapPin, label: "Office", value: "Lagos, Nigeria" },
                        { icon: Globe, label: "Social", value: "@karbali_ads" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground">
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="eyebrow">{item.label}</p>
                            <p className="text-sm font-medium text-foreground">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="card-flat p-7 md:p-9">
                      <form onSubmit={handleContactSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="contact-name" className="text-xs font-medium text-foreground">Name</Label>
                            <Input id="contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Your name" maxLength={100} required className="h-11 rounded-lg" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contact-email" className="text-xs font-medium text-foreground">Email</Label>
                            <Input id="contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@company.com" maxLength={255} required className="h-11 rounded-lg" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-message" className="text-xs font-medium text-foreground">Message</Label>
                          <Textarea id="contact-message" value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} placeholder="How can we help?" maxLength={2000} required rows={5} className="min-h-[140px] rounded-lg resize-none" />
                        </div>
                        <Button type="submit" className="h-11 w-full rounded-lg text-sm font-semibold" disabled={contactSending}>
                          {contactSending ? "Sending..." : (<span className="flex items-center justify-center gap-2">Send message <Send className="h-4 w-4" /></span>)}
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Footer */}
          {s("footer").is_visible && (
            <Footer content={s("footer").content} />
          )}
        </>
      ) : null}
    </div>
  );
}
