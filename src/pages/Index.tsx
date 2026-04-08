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

      {/* Bottom feature cards floating over the hero fade — Minimalist Redesign */}
      <section className="relative z-10 -mt-28 px-6 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-px bg-white/5 border border-white/10 sm:grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-xl">
            {features.map((f) => (
              <div key={f.title} className="group bg-zinc-950 p-6 transition-colors hover:bg-zinc-900/50 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="text-sm font-bold tracking-tight text-white mb-2">{f.title}</h3>
                <p className="text-xs leading-relaxed text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — Minimalist Grid Redesign */}
      {s("how_it_works").is_visible && (
        <section id="how-it-works" className="relative z-10 py-32 px-6 sm:px-10 lg:px-16 overflow-hidden">
          <div className="mx-auto max-w-7xl">
            <MotionWrapper className="mb-24 text-center">
              <span className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4 block">Process</span>
              <h2 className="mb-6 text-white text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">{s("how_it_works").title}</h2>
              <p className="text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed">{s("how_it_works").subtitle}</p>
            </MotionWrapper>

            <div className="grid grid-cols-1 gap-px bg-white/5 border border-white/10 md:grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-2xl">
              {steps.map((step, i) => {
                const parts = step.replace(/^\d+\.\s*/, "").split(": ");
                const stepTitle = parts[0] || step;
                const desc = parts.slice(1).join(": ") || "";

                const icons = [Zap, Terminal, CheckCircle2, BarChart3];
                const Icon = icons[i] || Zap;

                return (
                  <MotionWrapper key={i} delay={i * 0.1} className="relative group bg-zinc-950 p-10 hover:bg-zinc-900/40 transition-colors duration-500 h-full">
                    <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-500">
                      <Icon className="h-8 w-8" />
                    </div>

                    <div className="absolute top-10 right-10 text-5xl font-bold text-white/5 select-none font-mono">
                      0{i + 1}
                    </div>

                    <h3 className="mb-4 text-xl font-bold text-white tracking-tight">{stepTitle}</h3>
                    <p className="text-sm leading-relaxed text-zinc-400">{desc}</p>
                  </MotionWrapper>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA — Minimalist Redesign */}
      <section className="relative z-10 py-32 px-6 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="relative rounded-[2rem] border border-white/10 bg-zinc-950 p-12 md:p-20 overflow-hidden text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            <MotionWrapper>
              <h2 className="mb-6 text-white text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">Ready to migrate customers?</h2>
              <p className="mb-10 text-zinc-400 max-w-lg mx-auto text-lg leading-relaxed">Join the next generation of performance-driven advertisers today.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup" className="w-full sm:w-auto">
                  <button className="w-full h-14 px-10 rounded-xl bg-white text-black text-sm font-bold uppercase tracking-widest hover:bg-primary transition-colors">
                    Get Started Now
                  </button>
                </Link>
                <Link to="/about" className="w-full sm:w-auto">
                  <button className="w-full h-14 px-10 rounded-xl border border-white/10 text-white text-sm font-bold uppercase tracking-widest hover:bg-white/5 transition-colors">
                    Learn More
                  </button>
                </Link>
              </div>
            </MotionWrapper>
          </div>
        </div>
      </section>

      {/* Contact Form — Minimalist Redesign */}
      {s("contact").is_visible && (
        <section id="contact" className="relative z-10 py-32 px-6 sm:px-10 overflow-hidden">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-20 lg:grid-cols-2">
              <MotionWrapper className="flex flex-col justify-center">
                <span className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-6 block">Inquiry</span>
                <h2 className="mb-8 text-white text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight">{s("contact").title}</h2>
                <p className="text-zinc-400 text-lg mb-12 max-w-md leading-relaxed">{s("contact").subtitle}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {[
                    { icon: Mail, label: "Email Us", value: "hello@karbali.com" },
                    { icon: MapPin, label: "Visit Us", value: "Stockholm, Sweden" },
                  ].map((item, i) => (
                    <div key={i} className="group">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-white/5 text-primary mb-4 group-hover:border-primary/50 transition-colors">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{item.label}</p>
                      <p className="text-white font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>
              </MotionWrapper>

              <MotionWrapper delay={0.2}>
                <div className="relative rounded-2xl border border-white/10 bg-zinc-950 p-8 md:p-12 overflow-hidden">
                  <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 blur-[100px]" />

                  <form onSubmit={handleContactSubmit} className="relative z-10 space-y-8">
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                      <div className="space-y-3">
                        <Label htmlFor="contact-name" className="text-xs font-bold uppercase tracking-wider text-zinc-400">Name</Label>
                        <Input id="contact-name" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Your name" maxLength={100} required className="h-14 rounded-xl border-white/10 bg-zinc-900/50 px-5 focus:border-primary/50 focus:ring-0 transition-all text-white placeholder:text-zinc-600" />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="contact-email" className="text-xs font-bold uppercase tracking-wider text-zinc-400">Email</Label>
                        <Input id="contact-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@company.com" maxLength={255} required className="h-14 rounded-xl border-white/10 bg-zinc-900/50 px-5 focus:border-primary/50 focus:ring-0 transition-all text-white placeholder:text-zinc-600" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="contact-message" className="text-xs font-bold uppercase tracking-wider text-zinc-400">Message</Label>
                      <Textarea id="contact-message" value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="How can we help?" maxLength={2000} required rows={4} className="min-h-[160px] rounded-xl border-white/10 bg-zinc-900/50 px-5 py-5 focus:border-primary/50 focus:ring-0 transition-all text-white placeholder:text-zinc-600 resize-none" />
                    </div>
                    <button type="submit" className="w-full h-14 rounded-xl bg-white text-black text-sm font-bold uppercase tracking-widest hover:bg-primary transition-colors disabled:opacity-50" disabled={contactSending}>
                      {contactSending ? "Processing..." : "Send Message"}
                    </button>
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
