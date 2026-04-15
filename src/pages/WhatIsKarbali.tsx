import { Link } from "react-router-dom";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { CheckCircle2, Shield, Zap, BarChart3, HelpCircle, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { GlassButton } from "@/components/ui/glass-button";
import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function WhatIsKarbali() {
  const { theme, toggleTheme } = useTheme();

  const faqs = [
    {
      q: "What is Karbali?",
      a: "Karbali is a performance-based customer acquisition and advertising platform. We help businesses grow by connecting them with customers through targeted campaigns, where you only pay when a real sale or milestone occurs."
    },
    {
      q: "How does Karbali's financial assistant work?",
      a: "Our specialized financial assistant maps out user spending habits—from rent and food to data and subscriptions. It gets to know users personally to identify which brands they currently patronize and where they can find better value."
    },
    {
      q: "How do I get customers fast with Karbali?",
      a: "Karbali directs users to switch from their current brands to your business based on their actual spending patterns. Because users are incentivized to stay with advertiser brands, you gain high-intent customers who are ready to buy."
    },
    {
      q: "Is Karbali better than traditional advertising?",
      a: "Yes, because you only pay after a sale happens. Traditional platforms charge for views or clicks that might never convert. Karbali ensures every dollar spent results in a verified transaction."
    },
    {
      q: "How are users incentivized to stay with my brand?",
      a: "Each transaction a user makes with your brand serves as a monetary deposit into their yearly savings account. Instead of depositing money themselves, their daily spending helps grow their savings, creating extreme loyalty."
    }
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>What is Karbali? | Customer Acquisition & Advertising Platform</title>
        <meta name="description" content="Learn what Karbali is, how it works, and why it's the best platform for customer acquisition and performance marketing." />
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      <FluidCanvas />

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-md border-b border-border py-2">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={22} />
              <span className="text-lg font-bold tracking-tight">Karbali Ads</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/blog" className="hidden text-sm transition-colors sm:block text-muted-foreground hover:text-primary">Blog</Link>
              <button onClick={toggleTheme} className="rounded-lg p-2 text-muted-foreground hover:text-primary">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link to="/signup">
                <GlassButton variant="default" size="sm">Get Started</GlassButton>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20 px-6">
        <div className="mx-auto max-w-4xl">
          <MotionWrapper className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">What is Karbali?</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Karbali is the world's first **incentivized migration platform** and customer acquisition solution. We help businesses acquire high-quality users from competitors using real-world financial intelligence.
            </p>
          </MotionWrapper>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {[
              { icon: Zap, title: "Performance First", desc: "Stop paying for clicks. With Karbali, you only pay for verified sales, signups, or downloads." },
              { icon: Shield, title: "Verified Results", desc: "Our platform ensures every customer you pay for is real and has completed the action you defined." },
              { icon: BarChart3, title: "Growth Engine", desc: "Use our data-driven insights to find where your potential customers are spending and bring them to you." },
              { icon: CheckCircle2, title: "User Incentives", desc: "Customers are rewarded for choosing you, with ad budgets helping grow their personal savings." }
            ].map((f, i) => (
              <MotionItem key={i} delay={i * 0.1}>
                <div className="p-8 rounded-[2rem] bg-card/40 border border-border/50 backdrop-blur-md h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </MotionItem>
            ))}
          </div>

          <MotionWrapper className="mb-20">
            <div className="p-10 md:p-16 rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
              <h2 className="text-3xl font-extrabold mb-8 text-center">How Karbali Scales Your Business</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                <div>
                  <h3 className="text-xl font-bold mb-4 text-primary">For Advertisers</h3>
                  <div className="space-y-6">
                    {[
                      { step: "1", title: "Integration", desc: "Sync with our API and define your target customer profile." },
                      { step: "2", title: "Intent Mapping", desc: "We identify users already spending money in your category (fintech, health, etc.)." },
                      { step: "3", title: "Direct Migration", desc: "We guide users to switch from their current providers to your brand." },
                      { step: "4", title: "Pay After Sale", desc: "You only pay us after a successful transaction is verified. Zero risk." }
                    ].map((s, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                          {s.step}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm mb-1">{s.title}</h4>
                          <p className="text-xs text-muted-foreground">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-4 text-primary">For Your Customers</h3>
                  <div className="space-y-6">
                    {[
                      { step: "1", title: "Personal Assistant", desc: "Users get a financial mapping tool that understands their daily needs." },
                      { step: "2", title: "Smart Switching", desc: "We recommend better brand alternatives based on their spending profile." },
                      { step: "3", title: "Yearly Savings", desc: "Every transaction with your brand earns them deposits into a savings account." },
                      { step: "4", title: "Extreme Loyalty", desc: "Users stay because they save money simply by using your services." }
                    ].map((s, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                          {s.step}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm mb-1">{s.title}</h4>
                          <p className="text-xs text-muted-foreground">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </MotionWrapper>

          <MotionWrapper id="faq">
            <h2 className="text-3xl font-extrabold mb-10 text-center flex items-center justify-center gap-3">
              <HelpCircle className="text-primary h-8 w-8" /> Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="p-8 rounded-2xl bg-card/30 border border-border/40 backdrop-blur-sm">
                  <h4 className="text-lg font-bold mb-3">{faq.q}</h4>
                  <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </MotionWrapper>

          <div className="mt-20 text-center">
            <Link to="/signup">
              <GlassButton variant="glow" size="lg" className="px-12 h-16 rounded-2xl text-lg">
                Start Growing Today <ArrowRight className="ml-2 h-5 w-5" />
              </GlassButton>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
