import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence } from "framer-motion";

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
  const [index, setIndex] = useState(0);
  const words = ["Brand", "Business", "App", "Shop"];

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-20">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          src="/hero-animation.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background" />
      </div>

      <div className="relative z-10 container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Next Gen Attribution
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white mb-6 leading-[1.1]">
            {title?.includes("Your Brand") ? (
              <>
                {title.split("Your Brand")[0]}Your{" "}
                <span className="relative inline-block text-primary">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={words[index]}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="inline-block"
                    >
                      {words[index]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </>
            ) : title}
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/70 mb-10 leading-relaxed">
            {subtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <GlassButton size="lg" className="h-14 px-10 text-lg rounded-2xl group">
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </GlassButton>
            </Link>
            <Link to="/docs">
              <button className="h-14 px-10 text-white font-bold flex items-center gap-2 hover:text-primary transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
                  <Play className="h-4 w-4 fill-white" />
                </div>
                View API Docs
              </button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Floating Elements / Decals */}
      <div className="absolute bottom-10 left-10 hidden xl:block animate-bounce opacity-20">
        <div className="w-1 h-20 bg-gradient-to-b from-primary to-transparent" />
      </div>
      <div className="absolute top-40 right-10 hidden xl:block animate-pulse opacity-20">
        <div className="w-20 h-1 bg-gradient-to-r from-transparent to-primary" />
      </div>
    </section>
  );
}
