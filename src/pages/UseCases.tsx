import { Link } from "react-router-dom";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { ArrowRight, Smartphone, Globe, Briefcase, ShoppingBag, Rocket } from "lucide-react";
import Logo from "@/components/Logo";
import { GlassButton } from "@/components/ui/glass-button";
import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function UseCases() {
  const { theme, toggleTheme } = useTheme();

  const useCases = [
    {
      icon: Rocket,
      title: "For Startups",
      description: "Get your first 1,000 users without burning through your seed funding. Pay only when users actually sign up and experience your product.",
      benefits: ["Low risk acquisition", "High quality users", "Performance tracking"]
    },
    {
      icon: Smartphone,
      title: "For Mobile Apps",
      description: "Boost your App Store ranking with verified downloads. Karbali ensures you're paying for real people who install and open your app.",
      benefits: ["Charge per install", "Deep link support", "Fraud protection"]
    },
    {
      icon: ShoppingBag,
      title: "For E-commerce",
      description: "Direct shoppers from competitors to your store. Pay a commission only after a successful transaction is completed.",
      benefits: ["ROAS-focused", "Incentivized switching", "Basket size tracking"]
    },
    {
      icon: Briefcase,
      title: "For Service Providers",
      description: "Whether you offer consulting, health services, or digital subscriptions, find people who already pay for similar services and bring them to you.",
      benefits: ["Intent-based matching", "Niche targeting", "Higher LTV"]
    }
  ];

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>Use Cases | How Businesses Grow with Karbali Ads</title>
        <meta name="description" content="Discover how startups, mobile apps, e-commerce brands, and service providers use Karbali to acquire customers and increase sales." />
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
        <div className="mx-auto max-w-6xl">
          <MotionWrapper className="text-center mb-20">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">Built for Every Growth Stage</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Explore how different industries use Karbali Ads to acquire users and scale revenue with zero wasted ad spend.
            </p>
          </MotionWrapper>

          <MotionStagger className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {useCases.map((uc, i) => (
              <MotionItem key={i}>
                <div className="group p-10 rounded-[3rem] bg-card/40 border border-border/50 backdrop-blur-md h-full transition-all duration-500 hover:border-primary/30 hover:bg-card/60">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                    <uc.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4">{uc.title}</h3>
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{uc.description}</p>
                  <ul className="space-y-3 mb-10">
                    {uc.benefits.map((benefit, j) => (
                      <li key={j} className="flex items-center gap-3 text-sm font-medium">
                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                          <ArrowRight className="h-3 w-3" />
                        </div>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <Link to="/signup">
                    <GlassButton variant="ghost" className="w-full justify-between h-14 px-6 rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                      Get Started <ArrowRight className="h-5 w-5" />
                    </GlassButton>
                  </Link>
                </div>
              </MotionItem>
            ))}
          </MotionStagger>

          <div className="mt-32 p-12 md:p-20 rounded-[3rem] bg-foreground text-background relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">Ready to see your business grow?</h2>
                <p className="text-xl opacity-80 mb-10">
                  Join 500+ advertisers who have switched to performance-based customer acquisition.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link to="/signup">
                    <GlassButton size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-16 px-10 rounded-2xl text-lg">
                      Create Your Campaign
                    </GlassButton>
                  </Link>
                  <Link to="/docs">
                    <GlassButton variant="outline" size="lg" className="border-background/20 hover:bg-background/10 h-16 px-10 rounded-2xl text-lg">
                      View API Docs
                    </GlassButton>
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block relative">
                <div className="aspect-square rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center p-12">
                   <Logo size={200} className="opacity-20" />
                </div>
              </div>
            </div>
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
            <Link to="/what-is-karbali" className="hover:text-primary transition-colors">What is Karbali?</Link>
          </div>
          <p className="text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} Karbali Ads. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
