import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  title: string | null;
  subtitle: string | null;
}

export default function LandingVariant5({ title, subtitle }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const words = ["Brand", "Business", "Shop"];

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
    const interval = setInterval(() => setIndex((p) => (p + 1) % words.length), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative z-0 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/70 z-[1]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 z-[2] opacity-10" style={{
          backgroundImage: "linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-[1] h-64 bg-gradient-to-t from-background via-background/90 to-transparent" />

      {/* Bottom-right aligned content */}
      <div className="relative z-10 flex min-h-screen items-end justify-end px-6 pb-32 pt-32 sm:px-10 lg:px-20">
        <div className="max-w-2xl text-right">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
            <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {title?.includes("Your Brand") ? (
                <>
                  {title.split("Your Brand")[0]}Your{" "}
                  <AnimatePresence mode="wait">
                    <motion.span key={words[index]} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.5 }} className="text-[#22c55e]">
                      {words[index]}
                    </motion.span>
                  </AnimatePresence>
                </>
              ) : title}
            </h1>
            <p className="mt-6 ml-auto max-w-lg text-base text-white/50 leading-relaxed">{subtitle}</p>
            <div className="mt-10 flex flex-wrap items-center justify-end gap-3">
              <Link to="/docs">
                <GlassButton size="lg" variant="outline" className="border-white/30 bg-white/5 px-10 backdrop-blur-md hover:bg-white/10">
                  <span className="text-white font-bold">View API Docs</span>
                </GlassButton>
              </Link>
              <Link to="/signup">
                <GlassButton size="lg" variant="glow" className="px-10">Start Free <ArrowRight className="h-4 w-4" /></GlassButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
