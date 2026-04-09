import { Link } from "react-router-dom";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { CheckCircle2, Shield, Zap, BarChart3, HelpCircle, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";
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
      q: "How does Karbali work?",
      a: "We use a financial behavioral mapping assistant to understand user spending patterns. We then direct these users to switch to partner brands that offer better value. Advertisers only pay Karbali after a successful sale is verified."
    },
    {
      q: "Who is Karbali for?",
      a: "Karbali is designed for startups, fintechs, e-commerce brands, and service providers who want to acquire high-quality users without wasting budget on clicks that don't convert."
    },
    {
      q: "Why is Karbali different?",
      a: "Unlike traditional platforms that charge for impressions or clicks, Karbali focuses on outcomes. Our unique incentive model rewards users for trying new services, depositing budget directly into their savings for every transaction."
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
              Karbali is the world's first **incentivized migration platform** designed to help businesses acquire customers from competitors using real-world financial intelligence.
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
              <h2 className="text-3xl font-extrabold mb-8">How It Works for Businesses</h2>
              <div className="space-y-8">
                {[
                  { step: "1", title: "Define Your Target", desc: "Tell us what kind of customers you need and what milestones you're willing to pay for." },
                  { step: "2", title: "Financial Intelligence Mapping", desc: "Our AI assistant identifies users currently spending with competitors in your niche." },
                  { step: "3", title: "Strategic Migration", desc: "We present your brand as the superior alternative, incentivizing users to switch." },
                  { step: "4", title: "Pay Only for Sales", desc: "When the user completes a purchase or signup, your budget is released. No sale, no fee." }
                ].map((s, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {s.step}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{s.title}</h4>
                      <p className="text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                ))}
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

      <footer className="relative z-10 border-t border-border/50 py-16 px-6">
        <div className="mx-auto max-w-7xl flex flex-col items-center justify-center text-center gap-6">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="text-lg font-bold text-gradient">Karbali Ads</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">Performance Attribution Platform. Track real outcomes, not vanity metrics.</p>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <Link to="/docs" className="hover:text-primary transition-colors">API Docs</Link>
          </div>
          <p className="text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} Karbali Ads. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
