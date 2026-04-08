import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { BarChart3, Shield, Zap, DollarSign, Sun, Moon, ArrowRight, Send, Terminal, CheckCircle2, Mail, MapPin, Globe } from "lucide-react";
import Logo from "@/components/Logo";
import { useTheme } from "@/lib/theme";
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
  hero: { section_key: "hero", title: "Migrate Customers to Your Brand", subtitle: "The performance attribution platform that helps advertisers acquire competitors' customers and only pay for real results.", content: null, is_visible: true },
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
  const [heroDesign, setHeroDesign] = useState("default");
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
        if (designData?.value) setHeroDesign(designData.value);
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

  const isVariant = heroDesign !== "default";

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

  const features = [
    { icon: BarChart3, title: "Real-Time Analytics", desc: "Track every event as it happens across web and mobile platforms" },
    { icon: DollarSign, title: "Milestone Billing", desc: "Charge per download, signup, or purchase with no double counting" },
    { icon: Shield, title: "Fraud Detection", desc: "IP-based rate limiting and pattern detection built in from day one" },
    { icon: Zap, title: "Simple API", desc: "One endpoint, three event types. Integrate in minutes, not days" },
  ];

  const steps = (s("how_it_works").content || "").split(/\r?\n|\\n/).filter(Boolean);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
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
              <button onClick={toggleTheme} className={`rounded-lg p-2 transition-colors ${scrolled ? "text-muted-foreground hover:text-primary" : "text-white/60 hover:text-white"}`} aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
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
      (
        <>
          {/* Default layout */}
          {s("hero").is_visible && (
            <LandingHero title={s("hero").title} subtitle={s("hero").subtitle} metrics={metrics} metricsLoading={metricsLoading} />
          )}

          {/* Feature cards */}
          <section className="relative z-10 -mt-16 px-6 sm:px-10 lg:px-16">
            <div className="mx-auto max-w-6xl">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {features.map((f) => (
                  <div key={f.title} className="group flex flex-col items-start transition-all">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                      <f.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                      {f.title}
                      <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground/80">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          {s("how_it_works").is_visible && (
            <section id="how-it-works" className="relative z-10 py-32 px-6 sm:px-10 lg:px-16 bg-background overflow-hidden">
              <div className="absolute top-0 -left-20 h-[500px] w-[500px] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />
              <div className="absolute bottom-0 -right-20 h-[500px] w-[500px] rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none" />
              <div className="relative z-10 mx-auto max-w-7xl">
                <MotionWrapper className="mb-20 text-center">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6 border border-primary/20">Step-by-Step</span>
                  <h2 className="mb-6 text-foreground text-4xl md:text-5xl font-extrabold tracking-tight">{s("how_it_works").title}</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">{s("how_it_works").subtitle}</p>
                </MotionWrapper>

                <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
                  {steps.map((step, i) => {
                    const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                    const stepTitle = parts[0] || step;
                    const desc = parts.slice(1).join(": ") || "";
                    const icons = [Zap, Terminal, CheckCircle2, BarChart3];
                    const Icon = icons[i] || Zap;

                    return (
                      <MotionWrapper key={i} delay={i * 0.1} className="relative">
                        <div className="relative flex flex-col items-start text-left h-full rounded-[2.5rem] bg-card/40 backdrop-blur-3xl p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-border/50 transition-all duration-700 hover:bg-card/60 hover:-translate-y-4 hover:border-primary/30 group overflow-hidden">
                          <div className="absolute top-0 left-0 h-[2px] w-0 bg-gradient-to-r from-transparent via-primary to-transparent transition-all duration-700 group-hover:w-full" />
                          <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-[0_0_30px_rgba(34,197,94,0.1)] transition-all duration-700 group-hover:bg-primary/20 group-hover:shadow-[0_0_40px_rgba(34,197,94,0.3)] group-hover:rotate-[10deg]">
                            <Icon className="h-10 w-10" />
                          </div>
                          <div className="absolute -top-4 -right-4 text-9xl font-black text-foreground/[0.03] select-none transition-all duration-700 group-hover:text-foreground/[0.08] group-hover:scale-110">{i + 1}</div>
                          <h3 className="mb-6 text-2xl font-bold text-foreground leading-tight tracking-tight group-hover:text-primary transition-colors duration-500">{stepTitle}</h3>
                          <p className="text-base font-medium leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors duration-500">{desc}</p>
                          <div className="mt-8 flex items-center text-primary/40 group-hover:text-primary transition-colors duration-500">
                            <span className="text-xs font-bold uppercase tracking-widest">Explore</span>
                            <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-2 transition-transform duration-500" />
                          </div>
                        </div>
                      </MotionWrapper>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* CTA */}
          <section className="relative z-10 py-20 px-6 sm:px-10">
            <div className="mx-auto max-w-5xl">
              <MotionWrapper className="relative overflow-hidden rounded-[2.5rem] bg-card p-12 md:p-20 text-center shadow-2xl border border-border/50">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-emerald-600/10 blur-[80px]" />
                <div className="relative z-10">
                  <div className="mb-8 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                  </div>
                  <h2 className="mb-4 text-foreground text-3xl md:text-5xl font-extrabold tracking-tight">Ready to migrate customers?</h2>
                  <p className="mb-10 text-muted-foreground max-w-xl mx-auto text-lg">Join the next generation of performance-driven advertisers.</p>
                  <Link to="/signup">
                    <GlassButton size="lg" variant="glow" className="px-12 h-14 text-lg">
                      Get Started Now <ArrowRight className="h-4 w-4 ml-2" />
                    </GlassButton>
                  </Link>
                </div>
              </MotionWrapper>
            </div>
          </section>

          {/* Contact Form */}
          {s("contact").is_visible && (
            <section id="contact" className="relative z-10 py-32 px-6 sm:px-10 overflow-hidden">
              <div className="mx-auto max-w-6xl">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                  <MotionWrapper className="flex flex-col justify-center">
                    <h2 className="mb-6 text-foreground text-4xl md:text-5xl lg:text-6xl font-extrabold">{s("contact").title}</h2>
                    <p className="text-muted-foreground text-lg mb-10 max-w-md">{s("contact").subtitle}</p>
                    <div className="space-y-6">
                      {[
                        { icon: Mail, label: "Email Us", value: "hello@karbali.com" },
                        { icon: MapPin, label: "Visit Us", value: "Lagos, Nigeria" },
                        { icon: Globe, label: "Follow Us", value: "@karbali_ads" }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <item.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                            <p className="text-foreground font-medium">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </MotionWrapper>
                  <MotionWrapper delay={0.2}>
                    <div className="relative rounded-[3rem] bg-card p-8 md:p-12 shadow-xl border border-border/50">
                      <form onSubmit={handleContactSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="contact-name" className="text-sm font-medium text-foreground">Name</Label>
                            <Input id="contact-name" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Your name" maxLength={100} required className="h-12 rounded-2xl border-border/40 bg-background/50 px-5" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contact-email" className="text-sm font-medium text-foreground">Email</Label>
                            <Input id="contact-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@company.com" maxLength={255} required className="h-12 rounded-2xl border-border/40 bg-background/50 px-5" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-message" className="text-sm font-medium text-foreground">Message</Label>
                          <Textarea id="contact-message" value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="How can we help?" maxLength={2000} required rows={4} className="min-h-[120px] rounded-2xl border-border/40 bg-background/50 px-5 py-4 resize-none" />
                        </div>
                        <GlassButton type="submit" variant="glow" className="w-full h-12 rounded-2xl text-base font-semibold" disabled={contactSending}>
                          {contactSending ? "Processing..." : <span className="flex items-center justify-center gap-2">Send Message <Send className="h-4 w-4" /></span>}
                        </GlassButton>
                      </form>
                    </div>
                  </MotionWrapper>
                </div>
              </div>
            </section>
          )}

          {/* Footer */}
          {s("footer").is_visible && (
            <footer className="relative z-10 border-t border-border/50 py-16 px-6 sm:px-10">
              <div className="mx-auto max-w-7xl flex flex-col items-center justify-center text-center gap-6">
                <div className="flex items-center gap-2">
                  <Logo size={20} />
                  <span className="text-lg font-bold text-gradient">Karbali Ads</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-md">{s("footer").content}</p>
                <p className="text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} Karbali Ads. All rights reserved.</p>
              </div>
            </footer>
          )}
        </>
      )}
    </div>
  );
}
