import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import { Button } from "@/components/ui/button";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { BarChart3, Shield, Zap, DollarSign, Sun, Moon, ArrowRight, Send, Terminal, CheckCircle2, Mail, MapPin, Globe, Menu, X, TrendingUp } from "lucide-react";
import featureAnalytics from "@/assets/feature-analytics.jpg";
import featureBilling from "@/assets/feature-billing.jpg";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
    const { error } = await supabase.from("contact_messages" as never).insert({ name: contactName.trim(), email: contactEmail.trim(), message: contactMessage.trim() } as never);
    setContactSending(false);
    if (error) { toast.error("Failed to send message. Please try again."); }
    else { toast.success("Message sent! We'll get back to you soon."); setContactName(""); setContactEmail(""); setContactMessage(""); }
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

          {/* FEATURES — Editorial high-contrast blocks */}
          <section className="relative z-10 py-24 md:py-32 px-6 sm:px-10 lg:px-16 border-b-2 border-foreground">
            <div className="mx-auto max-w-4xl">
              <MotionWrapper className="mb-12 md:mb-16 max-w-2xl">
                <p className="text-primary font-bold text-xs uppercase tracking-[0.25em] mb-4">Features</p>
                <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight leading-[1.05]">
                  Better data,<br className="hidden sm:block" /> smarter growth
                </h2>
              </MotionWrapper>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {[
                  { title: "Real-Time Analytics", desc: "Instant visibility into campaign performance metrics as they happen.", variant: "dark", tag: "01 / Data" },
                  { title: "Milestone Billing", desc: "Only pay when specific growth targets are reached and verified.", variant: "paper", tag: "02 / Billing" },
                  { title: "Fraud Detection", desc: "Advanced filtering to ensure every conversion comes from a real user.", variant: "emerald", tag: "03 / Trust" },
                  { title: "Simple API", desc: "Integrate with two lines of code and start tracking immediately.", variant: "paper", tag: "04 / Build" },
                ].map((f, i) => (
                  <MotionWrapper key={f.title} delay={i * 0.08}>
                    {f.variant === "dark" ? (
                      <div className="bg-black text-white p-8 border-l-8 border-primary h-full min-h-[200px] flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{f.tag}</span>
                        <div>
                          <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                          <p className="text-sm text-white/70 leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    ) : f.variant === "emerald" ? (
                      <div className="bg-primary text-primary-foreground p-8 border-2 border-foreground h-full min-h-[200px] flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">{f.tag}</span>
                        <div>
                          <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                          <p className="text-sm leading-relaxed opacity-90">{f.desc}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-card text-foreground p-8 border-2 border-foreground h-full min-h-[200px] flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{f.tag}</span>
                        <div>
                          <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    )}
                  </MotionWrapper>
                ))}
              </div>
            </div>
          </section>

          {/* HOW IT WORKS — Dark editorial with numbered rail */}
          {s("how_it_works").is_visible && (
            <section id="how-it-works" className="relative z-10 py-24 md:py-32 px-6 sm:px-10 lg:px-16 bg-black text-white">
              <div className="mx-auto max-w-3xl">
                <MotionWrapper className="mb-14 md:mb-20">
                  <p className="text-primary font-bold text-xs uppercase tracking-[0.25em] mb-4">Process</p>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">{s("how_it_works").title}</h2>
                  <p className="mt-5 text-white/60 text-base md:text-lg max-w-xl">{s("how_it_works").subtitle}</p>
                </MotionWrapper>

                <div className="relative space-y-10 md:space-y-12">
                  <div aria-hidden className="absolute left-6 top-6 bottom-6 w-[2px] bg-primary/25" />
                  {steps.map((step, i) => {
                    const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                    const stepTitle = parts[0] || step;
                    const desc = parts.slice(1).join(": ") || "";
                    const num = String(i + 1).padStart(2, "0");
                    const alt = i % 2 === 1;
                    return (
                      <MotionWrapper key={i} delay={i * 0.08}>
                        <div className="relative pl-20">
                          <div className={`absolute left-0 top-0 w-12 h-12 flex items-center justify-center font-bold text-base border-2 ${alt ? "bg-white text-black border-primary" : "bg-primary text-primary-foreground border-white"}`}>
                            {num}
                          </div>
                          <h4 className="text-xl md:text-2xl font-bold mb-2">{stepTitle}</h4>
                          <p className="text-sm md:text-base text-white/60 leading-relaxed">{desc}</p>
                        </div>
                      </MotionWrapper>
                    );
                  })}
                </div>

                <MotionWrapper delay={0.4}>
                  <Link to="/signup" className="block">
                    <button className="w-full mt-16 bg-primary text-primary-foreground font-bold py-5 px-6 text-sm uppercase tracking-[0.2em] border-2 border-primary hover:bg-white hover:text-black hover:border-white transition-colors">
                      Get started now
                    </button>
                  </Link>
                </MotionWrapper>
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
            <section id="contact" className="relative z-10 section-cream border-t border-border py-28 px-6 sm:px-10 lg:px-16">
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
