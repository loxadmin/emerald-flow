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
  about: { section_key: "about", title: "About Karbali", subtitle: null, content: null, is_visible: true },
  how_it_works: { section_key: "how_it_works", title: "How It Works", subtitle: "From campaign creation to verified results in four simple steps.", content: "1. Create a Campaign: Set your budget and define what you will pay for.\n2. Integrate Our API: Add a simple tracking snippet to your app.\n3. Get Approved: Our admin team verifies your integration and activates your campaign.\n4. Track and Pay for Results: Monitor real-time analytics and only pay when users take action.", is_visible: true },
  features: { section_key: "features", title: "Why Choose Karbali", subtitle: "Built for performance-driven advertisers who demand transparency.", content: null, is_visible: true },
  contact: { section_key: "contact", title: "Get in Touch", subtitle: "Have questions? We would love to hear from you.", content: null, is_visible: true },
  footer: { section_key: "footer", title: "Karbali", subtitle: null, content: "Performance Attribution Platform. Track real outcomes, not vanity metrics.", is_visible: true },
};

export default function Index() {
  const [content, setContent] = useState<Record<string, SiteContent>>(defaultContent);
  const [metrics, setMetrics] = useState({ advertisers: 0, campaigns: 0, events: 0 });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSending, setContactSending] = useState(false);

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

      {/* Transparent navbar overlaying the video */}
      <header className="fixed top-0 left-0 right-0 z-30">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo size={28} />
              <span className="text-xl font-bold tracking-tight text-white">Karbali</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link to="/about" className="hidden text-sm text-white/60 transition-colors hover:text-white sm:block">About</Link>
              <Link to="/docs" className="hidden text-sm text-white/60 transition-colors hover:text-white sm:block">API</Link>
              <button onClick={toggleTheme} className="rounded-lg p-2 text-white/60 transition-colors hover:text-white" aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link to="/signup">
                <GlassButton variant="outline" size="sm" className="border-white/20 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10">
                  Get Started
                </GlassButton>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero — video fills full viewport, navbar overlays it */}
      {s("hero").is_visible && (
        <LandingHero title={s("hero").title} subtitle={s("hero").subtitle} metrics={metrics} metricsLoading={metricsLoading} />
      )}

      {/* Feature stats row */}
      <section className="relative z-10 -mt-20 px-6 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border/40 bg-card/60 p-5 text-center backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-sm">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — Karbali-style alternating timeline */}
      {s("how_it_works").is_visible && (
        <section id="how-it-works" className="relative z-10 py-24 px-6 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-4xl">
            <MotionWrapper className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                How <span className="text-primary">Karbali</span> Works
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                {s("how_it_works").subtitle}
              </p>
            </MotionWrapper>

            {/* Timeline connector */}
            <div className="relative mt-16 space-y-0">
              {/* Vertical line */}
              <div className="absolute left-1/2 top-0 bottom-0 hidden w-px bg-border/60 md:block" />

              {steps.map((step, i) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const stepTitle = parts[0] || step;
                const desc = parts.slice(1).join(": ") || "";
                const icons = [Zap, Terminal, CheckCircle2, BarChart3];
                const Icon = icons[i] || Zap;
                const isEven = i % 2 === 0;

                return (
                  <MotionWrapper key={i} delay={i * 0.1}>
                    <div className={`flex flex-col items-center gap-6 py-6 md:flex-row ${isEven ? '' : 'md:flex-row-reverse'}`}>
                      {/* Icon + Number */}
                      <div className="flex flex-col items-center gap-2 md:w-16 shrink-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/50 bg-card text-primary shadow-sm">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">0{i + 1}</span>
                      </div>

                      {/* Content card */}
                      <div className={`flex-1 rounded-2xl border border-border/40 bg-card/50 p-6 backdrop-blur-sm ${isEven ? 'md:mr-auto md:ml-8' : 'md:ml-auto md:mr-8'} max-w-lg`}>
                        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                          {stepTitle}
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  </MotionWrapper>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA — centered card style */}
      <section className="relative z-10 py-20 px-6 sm:px-10">
        <div className="mx-auto max-w-xl">
          <MotionWrapper>
            <div className="rounded-2xl border border-border/40 bg-card/50 p-10 text-center backdrop-blur-sm">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Zap className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Ready to Start?</h2>
              <p className="mt-3 text-muted-foreground max-w-sm mx-auto">
                Join the next generation of performance-driven advertisers. It costs nothing to join.
              </p>
              <Link to="/signup" className="mt-6 inline-block">
                <GlassButton size="lg" variant="glow" className="px-10">
                  Get Started Now <ArrowRight className="h-4 w-4" />
                </GlassButton>
              </Link>
            </div>
          </MotionWrapper>
        </div>
      </section>

      {/* Contact Form — clean minimal */}
      {s("contact").is_visible && (
        <section id="contact" className="relative z-10 py-20 px-6 sm:px-10">
          <div className="mx-auto max-w-2xl">
            <MotionWrapper className="text-center mb-10">
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">{s("contact").title}</h2>
              <p className="mt-3 text-muted-foreground">{s("contact").subtitle}</p>
            </MotionWrapper>

            <MotionWrapper delay={0.15}>
              <div className="rounded-2xl border border-border/40 bg-card/50 p-8 backdrop-blur-sm">
                <form onSubmit={handleContactSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name" className="text-sm font-medium text-foreground">Name</Label>
                      <Input id="contact-name" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Your name" maxLength={100} required className="h-11 rounded-xl border-border/40 bg-background/50 px-4" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email" className="text-sm font-medium text-foreground">Email</Label>
                      <Input id="contact-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@company.com" maxLength={255} required className="h-11 rounded-xl border-border/40 bg-background/50 px-4" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-message" className="text-sm font-medium text-foreground">Message</Label>
                    <Textarea id="contact-message" value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="How can we help?" maxLength={2000} required rows={4} className="min-h-[120px] rounded-xl border-border/40 bg-background/50 px-4 py-3 resize-none" />
                  </div>
                  <GlassButton type="submit" variant="glow" className="w-full h-11 rounded-xl text-sm font-semibold" disabled={contactSending}>
                    {contactSending ? "Sending..." : (
                      <span className="flex items-center justify-center gap-2">
                        Send Message <Send className="h-4 w-4" />
                      </span>
                    )}
                  </GlassButton>
                </form>
              </div>
            </MotionWrapper>
          </div>
        </section>
      )}

      {/* Footer — 3-column Karbali style */}
      {s("footer").is_visible && (
        <footer className="relative z-10 border-t border-border/30 py-14 px-6 sm:px-10">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">About Us</h4>
                <div className="flex items-start gap-2">
                  <Logo size={16} />
                  <p className="text-sm text-muted-foreground">{s("footer").content}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Contact Us</h4>
                <p className="text-sm text-muted-foreground">Contact us at <a href="mailto:hello@karbali.com" className="text-primary hover:underline">hello@karbali.com</a></p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Quick Links</h4>
                <div className="space-y-2">
                  <Link to="/about" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
                  <Link to="/docs" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">API Docs</Link>
                  <Link to="/login" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Login</Link>
                </div>
              </div>
            </div>
            <div className="mt-10 pt-6 border-t border-border/20 text-center">
              <p className="text-xs text-muted-foreground/60">&copy; {new Date().getFullYear()} Karbali. All rights reserved.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
