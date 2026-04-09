import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper from "@/components/MotionWrapper";
import { BarChart3, Shield, Zap, DollarSign, Sun, Moon, ArrowRight, Send, CheckCircle2, Mail, MapPin, Globe, ChevronRight } from "lucide-react";
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
  const [heroDesign, setHeroDesign] = useState<string | null>(null);
  const [designReady, setDesignReady] = useState(false);
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
        const urlParams = new URLSearchParams(window.location.search);
        const variantParam = urlParams.get('variant');

        if (variantParam) {
          setHeroDesign(variantParam);
        } else {
          const { data: designData } = await supabase.from("admin_settings").select("value").eq("key", "landing_design").maybeSingle();
          setHeroDesign(designData?.value || "default");
        }
      } catch (e) { console.log("Design setting error:", e); setHeroDesign("default"); }
      setDesignReady(true);

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

  if (!designReady) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

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
    <div className="relative min-h-screen bg-background text-foreground selection:bg-primary/30">
      <FluidCanvas />

      {/* Modern Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "py-4" : "py-6"}`}>
        <div className="container mx-auto px-6">
          <nav className={`flex items-center justify-between px-6 py-3 rounded-2xl transition-all duration-500 ${scrolled ? "bg-background/80 backdrop-blur-xl border border-border/50 shadow-lg shadow-black/5" : "bg-transparent"}`}>
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-primary/10 p-1.5 rounded-xl group-hover:bg-primary/20 transition-colors">
                <Logo size={24} />
              </div>
              <span className="text-xl font-black tracking-tighter">KARBALI</span>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
              <Link to="/about" className="hover:text-primary transition-colors">About</Link>
              <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
              <Link to="/docs" className="hover:text-primary transition-colors">API Docs</Link>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-muted transition-colors">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link to="/login" className="hidden sm:block text-sm font-semibold hover:text-primary transition-colors">Login</Link>
              <Link to="/signup">
                <GlassButton size="sm" className="rounded-xl px-5">Get Started</GlassButton>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {heroDesign === "variant1" ? <LandingVariant1 {...variantProps} /> :
       heroDesign === "variant2" ? <LandingVariant2 {...variantProps} /> :
       heroDesign === "variant3" ? <LandingVariant3 {...variantProps} /> :
       heroDesign === "variant4" ? <LandingVariant4 {...variantProps} /> :
       heroDesign === "variant5" ? <LandingVariant5 {...variantProps} /> :
      (
        <>
          {/* Default Hero */}
          <LandingHero title={s("hero").title} subtitle={s("hero").subtitle} metrics={metrics} metricsLoading={metricsLoading} />

          {/* Features Bento */}
          <section className="py-32 px-6">
            <div className="container mx-auto">
              <MotionWrapper className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Everything you need to <span className="text-primary">scale</span></h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{s("features").subtitle}</p>
              </MotionWrapper>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((f, i) => (
                  <MotionWrapper key={f.title} delay={i * 0.1}>
                    <div className="group relative p-8 rounded-[2rem] bg-card border border-border/50 hover:border-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/5">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                        <f.icon className="w-7 h-7" />
                      </div>
                      <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </MotionWrapper>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works Cinematic */}
          <section className="py-32 bg-muted/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-background to-transparent" />
            <div className="container mx-auto px-6">
              <div className="grid lg:grid-cols-2 gap-20 items-center">
                <MotionWrapper>
                  <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">{s("how_it_works").title}</h2>
                  <p className="text-xl text-muted-foreground mb-12 leading-relaxed">{s("how_it_works").subtitle}</p>

                  <div className="space-y-4">
                    {steps.map((step, i) => {
                      const title = step.split(":")[0]?.replace(/^\d+\.\s*/, "") || step;
                      return (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/30 transition-colors group">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-white transition-all">
                            {i + 1}
                          </div>
                          <span className="font-bold text-lg">{title}</span>
                          <ChevronRight className="ml-auto w-5 h-5 opacity-30 group-hover:opacity-100 transition-opacity" />
                        </div>
                      );
                    })}
                  </div>
                </MotionWrapper>

                <MotionWrapper delay={0.2} className="relative">
                  <div className="aspect-square rounded-[3rem] bg-gradient-to-br from-primary/20 via-transparent to-primary/10 p-8">
                    <div className="w-full h-full rounded-[2rem] bg-card shadow-2xl overflow-hidden border border-border/50 flex flex-col">
                      <div className="h-12 border-b border-border/50 px-6 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-destructive/50" />
                        <div className="w-3 h-3 rounded-full bg-warning/50" />
                        <div className="w-3 h-3 rounded-full bg-success/50" />
                      </div>
                      <div className="p-8 flex-1 font-mono text-sm overflow-hidden">
                        <div className="text-primary mb-4">POST /api/track</div>
                        <div className="text-muted-foreground space-y-2">
                          <div>{"{"}</div>
                          <div className="pl-4">"referral_id": "usr_9420",</div>
                          <div className="pl-4">"event": "purchase",</div>
                          <div className="pl-4">"amount": 24000</div>
                          <div>{"}"}</div>
                        </div>
                        <div className="mt-8 pt-8 border-t border-border/50">
                          <div className="text-success">200 OK</div>
                          <div className="text-muted-foreground">Campaign tracked successfully</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </MotionWrapper>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-32 px-6">
            <div className="container mx-auto">
              <div className="relative rounded-[3rem] bg-primary p-12 md:p-24 overflow-hidden text-center text-primary-foreground">
                <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-white/10 rounded-full blur-[80px]" />
                <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-black/10 rounded-full blur-[80px]" />

                <MotionWrapper>
                  <h2 className="text-4xl md:text-6xl font-black mb-8">Ready to grow your brand?</h2>
                  <p className="text-xl opacity-80 mb-12 max-w-2xl mx-auto">Join the future of performance marketing and only pay for results that matter.</p>
                  <Link to="/signup">
                    <button className="h-16 px-12 bg-white text-primary font-black rounded-2xl hover:scale-105 transition-transform shadow-xl">
                      Start Your Campaign Today
                    </button>
                  </Link>
                </MotionWrapper>
              </div>
            </div>
          </section>

          {/* Minimalist Contact */}
          <section className="py-32 px-6">
            <div className="container mx-auto max-w-6xl">
              <div className="grid lg:grid-cols-2 gap-20">
                <MotionWrapper>
                  <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">{s("contact").title}</h2>
                  <p className="text-xl text-muted-foreground mb-12">{s("contact").subtitle}</p>

                  <div className="space-y-8">
                    <div className="flex gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold">Email</div>
                        <div className="text-muted-foreground">hello@karbali.com</div>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold">Office</div>
                        <div className="text-muted-foreground">Lagos, Nigeria</div>
                      </div>
                    </div>
                  </div>
                </MotionWrapper>

                <MotionWrapper delay={0.2}>
                  <form onSubmit={handleContactSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Your name" className="h-12 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@company.com" className="h-12 rounded-xl" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="How can we help?" rows={4} className="rounded-xl" />
                    </div>
                    <GlassButton type="submit" disabled={contactSending} className="w-full h-14 rounded-xl text-lg font-bold">
                      {contactSending ? "Sending..." : "Send Message"}
                    </GlassButton>
                  </form>
                </MotionWrapper>
              </div>
            </div>
          </section>

          {/* Simple Footer */}
          <footer className="py-20 border-t border-border/50">
            <div className="container mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-2">
                  <Logo size={20} />
                  <span className="font-black tracking-tighter">KARBALI</span>
                </div>
                <div className="flex gap-8 text-sm text-muted-foreground font-semibold">
                  <Link to="/about">About</Link>
                  <Link to="/blog">Blog</Link>
                  <Link to="/docs">API</Link>
                  <Link to="/terms">Terms</Link>
                </div>
                <div className="text-sm text-muted-foreground">
                  &copy; {new Date().getFullYear()} Karbali Ads.
                </div>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
