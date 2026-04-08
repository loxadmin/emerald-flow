import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Activity } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
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

export default function LandingHero({ title, subtitle }: LandingHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  return (
    <section className="relative z-10 overflow-hidden">
      {/* Video background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          src="/hero-animation.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
        />
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />
        {/* Emerald tinted overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
      </div>

      {/* Bottom gradient fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 z-[1] h-32 bg-gradient-to-t from-background to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex min-h-[85vh] items-center justify-center px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="futuristic-label mx-auto mb-8">
              <Activity className="h-3 w-3" />
              Performance Attribution Platform
            </div>

            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              {title}
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {subtitle}
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
        </div>
      </div>
    </section>
  );
}
