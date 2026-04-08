import { Link } from "react-router-dom";
import { ArrowRight, Target, TrendingUp, Users, Activity } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import HeroVideo from "@/components/HeroVideo";
import { motion } from "framer-motion";

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
    if (metricsLoading) return "—";
    return value >= 10 ? value.toLocaleString() : "—";
  };

  return (
    <section className="relative z-10 px-4 pt-6 pb-20 sm:px-6">
      <div className="container max-w-7xl">
        {/* Hero headline - centered above video */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 text-center"
        >
          <div className="futuristic-label mx-auto mb-6">
            <Activity className="h-3 w-3" />
            Performance Attribution Platform
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            {title}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {subtitle}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup">
              <GlassButton size="lg" variant="glow" className="px-10">
                Start Free <ArrowRight className="h-4 w-4" />
              </GlassButton>
            </Link>
            <Link to="/docs">
              <GlassButton size="lg" variant="outline" className="px-10">
                View API Docs
              </GlassButton>
            </Link>
          </div>
        </motion.div>

        {/* Video - cinematic full width */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <HeroVideo />
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-xl neon-border bg-card/50 p-5 backdrop-blur-sm"
            >
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/5 blur-2xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                    {formatMetric(stat.value)}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
                <stat.icon className="h-5 w-5 text-primary/60" />
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
