import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sun, Moon } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import Logo from "@/components/Logo";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper from "@/components/MotionWrapper";
import { useTheme } from "@/lib/theme";

export default function About() {
  const { theme, toggleTheme } = useTheme();
  const [content, setContent] = useState({ title: "About KARBALI ADS", subtitle: "We built KARBALI ADS to solve a simple problem: advertisers waste money on clicks and impressions that never convert.", body: "KARBALI ADS is a performance-based attribution platform. We connect advertisers with real users and charge only for measurable outcomes like downloads, signups, and purchases. No wasted ad spend. No guesswork. Just results." });

  useEffect(() => {
    supabase.from("site_content").select("title, subtitle, content").eq("section_key", "about").single().then(({ data }) => {
      if (data) setContent({ title: data.title || content.title, subtitle: data.subtitle || content.subtitle, body: data.content || content.body });
    });
  }, []);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <FluidCanvas />
      <div className="pointer-events-none fixed inset-0 z-0 futuristic-grid" />

      <header className="relative z-10 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="container max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo size={28} />
              <span className="text-xl font-bold tracking-tight text-gradient">KARBALI ADS</span>
            </Link>
            <button onClick={toggleTheme} className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 py-24 sm:px-6">
        <div className="container max-w-3xl">
          <MotionWrapper>
            <div className="futuristic-label mb-6">About</div>
            <h1 className="mb-6 text-foreground">{content.title}</h1>
            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">{content.subtitle}</p>
            <div className="h-px w-24 bg-primary/40" />
            <p className="mt-8 leading-8 text-muted-foreground/80">{content.body}</p>

            <div className="mt-12">
              <Link to="/">
                <GlassButton variant="glow">← Back to Home</GlassButton>
              </Link>
            </div>
          </MotionWrapper>
        </div>
      </main>
    </div>
  );
}
