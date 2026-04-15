import { Link, useParams } from "react-router-dom";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper from "@/components/MotionWrapper";
import { Check, X, ArrowRight, Zap, DollarSign, Shield, BarChart3 } from "lucide-react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { GlassButton } from "@/components/ui/glass-button";
import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function Comparison() {
  const { competitor } = useParams();
  const { theme, toggleTheme } = useTheme();

  const competitorName = competitor?.charAt(0).toUpperCase() + competitor?.slice(1).replace("-", " ") || "Other Platforms";

  const comparisonData = [
    { feature: "Billing Model", karbali: "Pay After Sale Happens", other: "Pay-per-click/impression" },
    { feature: "Primary Focus", karbali: "Customer Acquisition Solution", other: "Advertising Platform" },
    { feature: "Targeting Method", karbali: "Financial spending mapping", other: "Estimated interests" },
    { feature: "Budget Risk", karbali: "Zero (Only pay for results)", other: "High (Pay regardless of sales)" },
    { feature: "User Retention", karbali: "Incentivized Yearly Savings", other: "None (One-time interaction)" },
  ];

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>Karbali Ads vs {competitorName} | Best Performance Marketing Platform</title>
        <meta name="description" content={`Compare Karbali Ads with ${competitorName}. See why performance-based billing and financial mapping outperform traditional advertising.`} />
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
        <div className="mx-auto max-w-5xl">
          <MotionWrapper className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">Karbali Ads vs {competitorName}</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Why leading brands are switching from traditional platforms to Karbali's performance-based ecosystem.
            </p>
          </MotionWrapper>

          <MotionWrapper className="mb-20 overflow-x-auto">
            <div className="min-w-[600px] rounded-[2.5rem] border border-border/50 bg-card/40 backdrop-blur-md overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="p-8 text-lg font-bold">Feature</th>
                    <th className="p-8 text-lg font-bold text-primary">Karbali Ads</th>
                    <th className="p-8 text-lg font-bold text-muted-foreground">{competitorName}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, i) => (
                    <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="p-8 font-medium">{row.feature}</td>
                      <td className="p-8">
                        <div className="flex items-center gap-2 font-bold text-foreground">
                          <Check className="text-primary h-5 w-5" /> {row.karbali}
                        </div>
                      </td>
                      <td className="p-8 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <X className="text-destructive h-5 w-5" /> {row.other}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MotionWrapper>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <MotionWrapper>
              <h2 className="text-3xl font-extrabold mb-6">The Karbali Advantage</h2>
              <div className="space-y-6">
                {[
                  { icon: DollarSign, title: "Zero Waste Policy", desc: "We eliminate the 'advertising tax'. You only pay for what you get." },
                  { icon: Zap, title: "Intent-Based Migration", desc: "Don't just show ads to people who might be interested. Show them to people who are already buying." },
                  { icon: Shield, title: "Fraud-Proof Attribution", desc: "Since we bill on sales, click-bots and impression-fraud are impossible." },
                  { icon: BarChart3, title: "Deep Financial Insights", desc: "Understand your customers better than ever with our behavioral mapping." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </MotionWrapper>

            <MotionWrapper className="bg-primary/5 p-10 rounded-[2.5rem] border border-primary/10 flex flex-col justify-center">
              <h3 className="text-2xl font-extrabold mb-4">Stop Paying for Clicks.</h3>
              <p className="text-muted-foreground mb-8">
                Traditional advertising is a gamble. Karbali is a solution. Switch to a platform that only wins when you make a sale.
              </p>
              <Link to="/signup">
                <GlassButton variant="glow" className="w-full h-14 rounded-2xl text-lg">
                  Start Getting Sales Now <ArrowRight className="ml-2 h-4 w-4" />
                </GlassButton>
              </Link>
            </MotionWrapper>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
