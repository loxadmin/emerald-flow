import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { BarChart3, Shield, Zap, DollarSign, Sun, Moon, ArrowRight, Send, Terminal, CheckCircle2, Mail, MapPin, Globe } from "lucide-react";
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
    "@type": "Product",
    "name": "Karbali Ads — Customer Acquisition Platform",
    "description": "Karbali Ads helps businesses find customers and get paying clients with performance-based advertising. Pay only for real signups, downloads, and sales.",
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
      <header className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-md border-b border-border py-2" : "bg-transparent py-4"}`}>
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={22} />
              <span className={`text-lg font-bold tracking-tight transition-colors ${scrolled ? "text-foreground" : "text-white"}`}>Karbali Ads</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/about" className={`hidden text-sm transition-colors sm:block ${scrolled ? "text-muted-foreground hover:text-primary" : "text-white/60 hover:text-white"}`}>About</Link>
              <Link to="/docs" className={`hidden text-sm transition-colors sm:block ${scrolled ? "text-muted-foreground hover:text-primary" : "text-white/60 hover:text-white"}`}>API</Link>
              <Link to="/blog" className={`hidden text-sm transition-colors sm:block ${scrolled ? "text-muted-foreground hover:text-primary" : "text-white/60 hover:text-white"}`}>Blog</Link>
              <button onClick={toggleTheme} className={`rounded-lg p-2 transition-colors ${scrolled ? "text-muted-foreground hover:text-primary" : "text-white/60 hover:text-white"}`} aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link to="/login" className={`text-sm font-medium transition-colors ${scrolled ? "text-foreground hover:text-primary" : "text-white hover:text-white/80"}`}>Log in</Link>
              <Link to="/signup">
                <GlassButton variant={scrolled ? "default" : "outline"} size="sm" className={scrolled ? "" : "border-white/20 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10"}>
                  Get Started
                </GlassButton>
              </Link>
            </div>
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

          {/* Trust strip */}
          <section className="relative z-10 -mt-10 px-6 sm:px-10 lg:px-16">
            <div className="mx-auto max-w-7xl">
              <p className="mb-8 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Trusted by performance teams across Africa
              </p>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
                {["Kuda", "Moniepoint", "Piggyvest", "Paystack", "Branch", "Chipper"].map((b) => (
                  <div
                    key={b}
                    className="flex items-center justify-center bg-card py-7 text-sm font-semibold tracking-tight text-muted-foreground/70 transition-colors hover:text-foreground"
                  >
                    {b}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Capability grid */}
          <section className="relative z-10 px-6 py-28 sm:px-10 lg:px-16">
            <div className="mx-auto max-w-7xl">
              <MotionWrapper className="mb-14 max-w-2xl">
                <p className="eyebrow mb-3">Built for outcomes</p>
                <h2 className="text-[32px] font-semibold leading-tight tracking-tight text-foreground sm:text-[40px]">
                  Every dollar tied to a verified result.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  Karbali is a performance attribution layer for advertisers who refuse to pay for noise. Track real outcomes, settle in real time, scale with confidence.
                </p>
              </MotionWrapper>

              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
                {features.map((f) => (
                  <div
                    key={f.title}
                    className="group flex flex-col gap-5 bg-card p-7 transition-colors hover:bg-secondary/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                        {f.title}
                      </h3>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          {s("how_it_works").is_visible && (
            <section id="how-it-works" className="relative z-10 px-6 py-28 sm:px-10 lg:px-16">
              <div className="mx-auto max-w-7xl">
                <MotionWrapper className="mb-16 grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-end">
                  <div>
                    <p className="eyebrow mb-3">How it works</p>
                    <h2 className="text-[32px] font-semibold leading-tight tracking-tight text-foreground sm:text-[40px]">
                      {s("how_it_works").title}
                    </h2>
                  </div>
                  <p className="text-[15px] leading-relaxed text-muted-foreground lg:max-w-md lg:justify-self-end">
                    {s("how_it_works").subtitle}
                  </p>
                </MotionWrapper>

                <hr className="divider-dashed mb-10" />

                <div className="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                  {steps.map((step, i) => {
                    const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                    const stepTitle = parts[0] || step;
                    const desc = parts.slice(1).join(": ") || "";
                    return (
                      <MotionWrapper key={i} delay={i * 0.08}>
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px] font-semibold tracking-[0.18em] text-primary">
                            STEP {String(i + 1).padStart(2, "0")}
                          </span>
                          <h3 className="mt-4 text-[18px] font-semibold leading-snug tracking-tight text-foreground">
                            {stepTitle}
                          </h3>
                          <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                            {desc}
                          </p>
                        </div>
                      </MotionWrapper>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* CTA banner */}
          <section className="relative z-10 px-6 py-20 sm:px-10 lg:px-16">
            <div className="mx-auto max-w-7xl">
              <MotionWrapper className="relative overflow-hidden rounded-[28px] border border-sidebar-border bg-sidebar p-10 sm:p-14 lg:p-20">
                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sidebar-primary/20 blur-[100px]" />
                <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-sidebar-primary/15 blur-[100px]" />
                <div className="relative z-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
                  <div>
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-sidebar-primary">
                      Ready when you are
                    </p>
                    <h2 className="text-[32px] font-semibold leading-tight tracking-tight text-white sm:text-[44px]">
                      Stop paying for noise.<br className="hidden sm:block" /> Pay for outcomes.
                    </h2>
                    <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-sidebar-foreground">
                      Spin up a campaign in minutes, attribute every conversion, and only settle for what's verified.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 lg:justify-end">
                    <Link to="/signup" className="btn-pill px-7 py-3 text-[14px] font-semibold">
                      Get started <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      to="/about"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-7 py-3 text-[14px] font-medium text-white transition-all hover:bg-white/10"
                    >
                      Learn more
                    </Link>
                  </div>
                </div>
              </MotionWrapper>
            </div>
          </section>

          {/* Contact */}
          {s("contact").is_visible && (
            <section id="contact" className="relative z-10 px-6 py-28 sm:px-10 lg:px-16">
              <div className="mx-auto max-w-5xl">
                <MotionWrapper className="mb-12 text-center">
                  <p className="eyebrow mb-3">Get in touch</p>
                  <h2 className="text-[32px] font-semibold leading-tight tracking-tight text-foreground sm:text-[40px]">
                    {s("contact").title}
                  </h2>
                  <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                    {s("contact").subtitle}
                  </p>
                </MotionWrapper>

                <MotionWrapper delay={0.15}>
                  <div className="card-soft p-8 sm:p-10">
                    <form onSubmit={handleContactSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="contact-name" className="text-[12.5px] font-medium text-foreground">Name</Label>
                          <Input id="contact-name" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Your name" maxLength={100} required className="h-11 rounded-xl border-border bg-background" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-email" className="text-[12.5px] font-medium text-foreground">Email</Label>
                          <Input id="contact-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@company.com" maxLength={255} required className="h-11 rounded-xl border-border bg-background" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-message" className="text-[12.5px] font-medium text-foreground">Message</Label>
                        <Textarea id="contact-message" value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="How can we help?" maxLength={2000} required rows={5} className="min-h-[140px] rounded-xl border-border bg-background resize-none" />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" /> hello@karbali.com
                          <span className="mx-2 text-border">·</span>
                          <MapPin className="h-3.5 w-3.5" /> Lagos, Nigeria
                        </div>
                        <button type="submit" className="btn-pill px-7 py-3 text-[14px] font-semibold disabled:opacity-60" disabled={contactSending}>
                          {contactSending ? "Sending…" : (<>Send message <Send className="h-4 w-4" /></>)}
                        </button>
                      </div>
                    </form>
                  </div>
                </MotionWrapper>
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
