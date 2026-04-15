import { Link, useLocation } from "react-router-dom";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { ArrowRight, CheckCircle2, Zap, DollarSign, Shield, HelpCircle, BarChart3, Rocket, Target, Users } from "lucide-react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { GlassButton } from "@/components/ui/glass-button";
import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface PageConfig {
  title: string;
  h1: string;
  problem: string;
  mistakes: string[];
  strategies: string[];
  faqs: { q: string; a: string }[];
}

const configs: Record<string, PageConfig> = {
  "/get-customers-for-my-business": {
    title: "How to Get Customers for Your Business (2026 Guide)",
    h1: "How to Get Customers for Your Business",
    problem: "Most businesses struggle to acquire customers because they rely on expensive ads that charge for clicks, not results. In 2026, the key to growth is intent-based migration.",
    mistakes: ["Paying for impressions instead of sales", "Targeting broad interests instead of real spending habits", "Ignoring the customer lifetime value"],
    strategies: ["Leverage financial behavior mapping", "Implement performance-based attribution", "Incentivize brand switching with real value"],
    faqs: [
      { q: "How do I get customers fast?", a: "The fastest way to get customers is to target people already spending money with your competitors using Karbali's financial mapping." },
      { q: "Is advertising the best way to get customers?", a: "Traditional advertising is risky. A performance-based customer acquisition solution is the superior alternative." }
    ]
  },
  "/how-to-get-users-for-my-app": {
    title: "How to Get Users for My App: 10 Proven Growth Strategies",
    h1: "How to Get Users for Your App",
    problem: "App growth isn't just about downloads; it's about active users who generate revenue. Traditional UA (User Acquisition) is becoming too expensive for most startups.",
    mistakes: ["Focusing on vanity metrics", "High CAC with low retention", "Bot-heavy ad networks"],
    strategies: ["Cost-per-install (CPI) optimization", "Verified event tracking", "Behavioral targeting based on app categories"],
    faqs: [
      { q: "What is the fastest way to get users?", a: "Karbali identifies users currently using apps in your category and directs them to switch to your app." },
      { q: "How can I lower my CAC?", a: "By using a pay-after-action model, you eliminate wasted spend on non-converting clicks." }
    ]
  },
  "/how-to-increase-sales-online": {
    title: "How to Increase Sales Online: The Ultimate Performance Guide",
    h1: "How to Increase Sales Online",
    problem: "Increasing sales online requires more than just traffic; it requires high-intent buyers who are ready to switch to a better alternative.",
    mistakes: ["Poor conversion optimization", "Targeting users with no purchase intent", "Fragmented attribution data"],
    strategies: ["Intent-based customer migration", "Commission-based billing", "User savings incentives"],
    faqs: [
      { q: "How can I increase sales quickly?", a: "Identify users who already buy similar products and offer them a better deal through Karbali's ecosystem." },
      { q: "Why are my ads not converting?", a: "You might be paying for clicks from people who aren't ready to buy. Switch to a pay-after-sale model." }
    ]
  },
  "/how-to-get-first-100-customers": {
    title: "How to Get Your First 100 Customers: A Startup Blueprint",
    h1: "How to Get Your First 100 Customers",
    problem: "The first 100 customers are the hardest. You need a low-risk way to find people who truly need your product without blowing your initial budget.",
    mistakes: ["Scaling too fast before validation", "Overspending on unproven channels", "Manual outreach that doesn't scale"],
    strategies: ["Targeted competitor migration", "Performance-linked incentives", "Direct outcome tracking"],
    faqs: [
      { q: "How do I find my first customers?", a: "Use Karbali to find users currently patronizing similar brands and show them why you're better." },
      { q: "What is the best channel for startups?", a: "A performance-based acquisition platform ensures you only spend money when you actually get a customer." }
    ]
  },
  "/customer-acquisition-for-startups": {
    title: "Customer Acquisition for Startups: Zero-Waste Growth Strategies",
    h1: "Customer Acquisition for Startups",
    problem: "Startups fail because they run out of money. Most of that money is wasted on inefficient customer acquisition that doesn't scale.",
    mistakes: ["Relying on organic growth alone", "Copying big brand ad strategies", "Not measuring real attribution"],
    strategies: ["Pay-after-sale customer acquisition", "Financial intent mapping", "Automated migration paths"],
    faqs: [
      { q: "How do startups acquire customers?", a: "Successful startups use performance-based platforms like Karbali to ensure every dollar results in a sale." },
      { q: "How much should a startup spend on acquisition?", a: "With Karbali, you set the price you're willing to pay per customer, ensuring you always stay profitable." }
    ]
  }
};

export default function ProblemSolution() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();

  const config = configs[pathname] || configs["/get-customers-for-my-business"];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": config.faqs.map(faq => ({
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
        <title>{config.title}</title>
        <meta name="description" content={config.problem} />
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
          <MotionWrapper className="mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-8 leading-tight">
              {config.h1}
            </h1>
            <div className="p-8 rounded-[2rem] bg-primary/5 border border-primary/20 mb-12">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Target className="text-primary h-6 w-6" /> The Problem
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {config.problem}
              </p>
            </div>
          </MotionWrapper>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <MotionWrapper>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Shield className="text-destructive h-6 w-6" /> Common Mistakes
              </h2>
              <ul className="space-y-4">
                {config.mistakes.map((m, i) => (
                  <li key={i} className="flex gap-3 items-start p-4 rounded-xl bg-card/40 border border-border/50">
                    <CheckCircle2 className="text-destructive h-5 w-5 mt-0.5 shrink-0" />
                    <span className="font-medium">{m}</span>
                  </li>
                ))}
              </ul>
            </MotionWrapper>

            <MotionWrapper delay={0.1}>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Zap className="text-primary h-6 w-6" /> Winning Strategies
              </h2>
              <ul className="space-y-4">
                {config.strategies.map((s, i) => (
                  <li key={i} className="flex gap-3 items-start p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <CheckCircle2 className="text-primary h-5 w-5 mt-0.5 shrink-0" />
                    <span className="font-medium">{s}</span>
                  </li>
                ))}
              </ul>
            </MotionWrapper>
          </div>

          <MotionWrapper className="mb-24 p-12 md:p-16 rounded-[3rem] bg-foreground text-background relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-primary/30 blur-[120px]" />
             <div className="relative z-10 text-center">
               <h2 className="text-4xl md:text-5xl font-black mb-6">The Real Solution: Karbali</h2>
               <p className="text-xl opacity-80 mb-10 max-w-2xl mx-auto">
                 Karbali isn't just an ad platform. It's a <strong>customer acquisition solution</strong> that handles the migration of high-intent users to your brand.
               </p>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="p-6 rounded-2xl bg-background/10 backdrop-blur-sm border border-background/20">
                    <DollarSign className="h-8 w-8 mx-auto mb-4" />
                    <h4 className="font-bold mb-2">Pay After Sale</h4>
                    <p className="text-sm opacity-70">Only spend money when a transaction happens.</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-background/10 backdrop-blur-sm border border-background/20">
                    <BarChart3 className="h-8 w-8 mx-auto mb-4" />
                    <h4 className="font-bold mb-2">Intent Mapping</h4>
                    <p className="text-sm opacity-70">Target users based on actual spending habits.</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-background/10 backdrop-blur-sm border border-background/20">
                    <Users className="h-8 w-8 mx-auto mb-4" />
                    <h4 className="font-bold mb-2">Incentivized Loyalty</h4>
                    <p className="text-sm opacity-70">Users save money by switching to you.</p>
                  </div>
               </div>
               <Link to="/signup">
                  <GlassButton className="bg-primary text-primary-foreground h-16 px-12 rounded-2xl text-xl font-bold">
                    Acquire Your First Customers <ArrowRight className="ml-2 h-6 w-6" />
                  </GlassButton>
               </Link>
             </div>
          </MotionWrapper>

          <MotionWrapper id="faq">
            <h2 className="text-3xl font-extrabold mb-10 text-center flex items-center justify-center gap-3">
              <HelpCircle className="text-primary h-8 w-8" /> FAQ: {config.h1}
            </h2>
            <div className="space-y-4">
              {config.faqs.map((faq, i) => (
                <div key={i} className="p-8 rounded-2xl bg-card/30 border border-border/40 backdrop-blur-sm">
                  <h4 className="text-lg font-bold mb-3">{faq.q}</h4>
                  <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </MotionWrapper>
        </div>
      </main>

      <Footer />
    </div>
  );
}
