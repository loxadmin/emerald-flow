import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  title: string | null;
  subtitle: string | null;
}

export default function LandingVariant3({ title, subtitle }: Props) {
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
      {/* Video with circular mask in the center */}
      <div className="absolute inset-0 z-0 bg-black">
        <div className="absolute inset-0 opacity-30">
          <video ref={videoRef} src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-[1] h-64 bg-gradient-to-t from-background via-background/90 to-transparent" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {/* Video window */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative mb-12 overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-emerald-500/10"
          style={{ width: "min(90vw, 600px)", aspectRatio: "16/9" }}
        >
          <video src="/hero-animation.mp4" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
              <Play className="h-6 w-6 text-white ml-1" fill="white" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
          <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
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
          <p className="mt-6 mx-auto max-w-lg text-base text-white/50 leading-relaxed">{subtitle}</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/signup">
              <GlassButton size="lg" variant="glow" className="px-10">Start Free <ArrowRight className="h-4 w-4" /></GlassButton>
            </Link>
            <Link to="/docs">
              <GlassButton size="lg" variant="outline" className="border-white/30 bg-white/5 px-10 backdrop-blur-md hover:bg-white/10">
                <span className="text-white font-bold">View API Docs</span>
              </GlassButton>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
