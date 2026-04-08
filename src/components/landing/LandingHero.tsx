import { Link } from "react-router-dom";
import { ArrowRight, Target, TrendingUp, Users } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import HeroVideo from "@/components/HeroVideo";

interface LandingHeroProps {
  title: string | null;
  subtitle: string | null;
  metricsLoading: boolean;
  metrics: {
    advertisers: number;
    campaigns: number;
    events: number;
  };
}

export default function LandingHero({ title, subtitle, metricsLoading, metrics }: LandingHeroProps) {
  const stats = [
    { icon: Users, label: "Active Advertisers", value: metrics.advertisers },
    { icon: Target, label: "Campaigns Tracked", value: metrics.campaigns },
    { icon: TrendingUp, label: "Events Processed", value: metrics.events },
  ];

  const formatMetric = (value: number) => {
    if (metricsLoading) return "Calculating";
    return value >= 10 ? value.toLocaleString() : "Calculating";
  };

  return (
    <section className="relative z-10 px-4 pb-16 pt-8 sm:px-6 md:pb-20 md:pt-10">
      <div className="container">
        <div className="relative overflow-hidden rounded-[2.25rem] border border-border/25 bg-background/45 px-5 py-6 backdrop-blur-sm sm:px-8 lg:px-10 lg:py-10">
          <div className="absolute -left-12 top-12 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="max-w-xl text-center lg:text-left">
              <div className="inline-flex items-center rounded-full border border-border/30 bg-background/75 px-3 py-1 text-xs font-medium uppercase tracking-[0.26em] text-muted-foreground">
                Performance Attribution Platform
              </div>

              <h1 className="mt-6 text-5xl font-semibold leading-[0.92] tracking-tight text-foreground sm:text-6xl xl:text-[4.6rem]">
                {title}
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {subtitle}
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link to="/signup" className="w-full sm:w-auto">
                  <GlassButton size="lg" variant="glow" className="w-full px-8 sm:w-auto">
                    Start Free <ArrowRight className="h-4 w-4" />
                  </GlassButton>
                </Link>
                <Link to="/docs" className="w-full sm:w-auto">
                  <GlassButton size="lg" variant="outline" className="w-full px-8 sm:w-auto">
                    View API Docs
                  </GlassButton>
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-border/25 bg-background/75 p-4 text-left"
                  >
                    <stat.icon className="h-5 w-5 text-primary" />
                    <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                      {formatMetric(stat.value)}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <HeroVideo />

              <div className="mt-4 flex justify-center lg:justify-start">
                <div className="inline-flex max-w-xl items-center gap-3 rounded-2xl border border-border/30 bg-card/90 px-4 py-3 text-sm text-foreground shadow-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                  <span>Competitor customers moving into your brand pipeline</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
