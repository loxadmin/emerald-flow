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

      {/* Bottom feature cards floating over the hero fade — like wan.video */}
      <section className="relative z-10 -mt-28 px-6 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-border/50 bg-card/80 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <f.icon className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — Redesigned Grid */}
      {s("how_it_works").is_visible && (
        <section id="how-it-works" className="relative z-10 py-32 px-6 sm:px-10 lg:px-16 overflow-hidden">
          <div className="mx-auto max-w-7xl">
            <MotionWrapper className="mb-20 text-center">
              <span className="futuristic-label mb-4">Process</span>
              <h2 className="mb-4 text-foreground text-4xl md:text-5xl">{s("how_it_works").title}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">{s("how_it_works").subtitle}</p>
            </MotionWrapper>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 relative">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent hidden lg:block -translate-y-16" />

              {steps.map((step, i) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const stepTitle = parts[0] || step;
                const desc = parts.slice(1).join(": ") || "";

                const icons = [Zap, Terminal, CheckCircle2, BarChart3];
                const Icon = icons[i] || Zap;

                return (
                  <MotionWrapper key={i} delay={i * 0.1} className="relative group">
                    <div className="clay-shadow relative h-full rounded-[2.5rem] border border-border/50 bg-card/40 p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:bg-card/60">
                      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-500">
                        <Icon className="h-7 w-7" />
                      </div>

                      <div className="absolute top-8 right-8 text-6xl font-black text-foreground/5 select-none">
                        0{i + 1}
                      </div>

                      <h3 className="mb-3 text-xl font-bold text-foreground">{stepTitle}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
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
        <div className="mx-auto max-w-3xl text-center">
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

      {/* Contact Form — Redesigned Split Layout */}
      {s("contact").is_visible && (
        <section id="contact" className="relative z-10 py-32 px-6 sm:px-10 overflow-hidden">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
              <MotionWrapper className="flex flex-col justify-center">
                <span className="futuristic-label mb-4 w-fit">Inquiry</span>
                <h2 className="mb-6 text-foreground text-4xl md:text-5xl lg:text-6xl">{s("contact").title}</h2>
                <p className="text-muted-foreground text-lg mb-10 max-w-md">{s("contact").subtitle}</p>

                <div className="space-y-6">
                  {[
                    { icon: Mail, label: "Email Us", value: "hello@karbali.com" },
                    { icon: MapPin, label: "Visit Us", value: "Stockholm, Sweden" },
                    { icon: Globe, label: "Follow Us", value: "@karbalihq" }
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
                <div className="clay-shadow relative rounded-[3rem] border border-border/50 bg-card/30 p-8 md:p-12 backdrop-blur-2xl">
                  <form onSubmit={handleContactSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="contact-name" className="text-sm font-medium text-foreground">Name</Label>
                        <Input id="contact-name" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Your name" maxLength={100} required className="h-12 rounded-2xl border-border/40 bg-background/50 px-5 focus:ring-primary/20" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-email" className="text-sm font-medium text-foreground">Email</Label>
                        <Input id="contact-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@company.com" maxLength={255} required className="h-12 rounded-2xl border-border/40 bg-background/50 px-5 focus:ring-primary/20" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-message" className="text-sm font-medium text-foreground">Message</Label>
                      <Textarea id="contact-message" value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="How can we help?" maxLength={2000} required rows={4} className="min-h-[120px] rounded-2xl border-border/40 bg-background/50 px-5 py-4 focus:ring-primary/20 resize-none" />
                    </div>
                    <GlassButton type="submit" variant="glow" className="w-full h-12 rounded-2xl text-base font-semibold" disabled={contactSending}>
                      {contactSending ? (
                        <>Processing...</>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Send Message <Send className="h-4 w-4" />
                        </span>
                      )}
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
        <footer className="relative z-10 border-t border-border/50 py-8 px-6 sm:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="flex items-center gap-2">
                <Logo size={20} />
                <span className="font-bold text-gradient">{s("footer").title}</span>
              </div>
              <p className="text-sm text-muted-foreground">{s("footer").content}</p>
              <p className="text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} Karbali. All rights reserved.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
