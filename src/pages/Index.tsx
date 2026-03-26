import { Link } from "react-router-dom";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard, GlassCardContent } from "@/components/ui/glass-card";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { BarChart3, Shield, Zap, DollarSign } from "lucide-react";
import Logo from "@/components/Logo";

export default function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <FluidCanvas />

      {/* Nav */}
      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-gradient">Karbali</span>
            </h1>
          </div>
          <div className="flex gap-3">
            <Link to="/login"><GlassButton variant="ghost">Sign In</GlassButton></Link>
            <Link to="/signup"><GlassButton variant="glow">Get Started</GlassButton></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 container py-28 text-center">
        <MotionWrapper>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-white/95 md:text-6xl">
            Performance Attribution
            <br />
            <span className="text-gradient">That Actually Works</span>
          </h1>
        </MotionWrapper>
        <MotionWrapper delay={0.15}>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/50">
            Track downloads, signups, and purchases. Pay only for real results. No clicks, no impressions—just outcomes.
          </p>
        </MotionWrapper>
        <MotionWrapper delay={0.3}>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/signup"><GlassButton size="lg" variant="glow">Start Free</GlassButton></Link>
            <Link to="/docs"><GlassButton size="lg" variant="outline">View API Docs</GlassButton></Link>
          </div>
        </MotionWrapper>
      </section>

      {/* Features */}
      <section className="relative z-10 border-t border-white/[0.06] py-20">
        <div className="container">
          <MotionWrapper>
            <h2 className="mb-12 text-center text-3xl font-bold text-white/90">Why Karbali?</h2>
          </MotionWrapper>
          <MotionStagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BarChart3, title: "Real-Time Analytics", desc: "Track every event as it happens across web and mobile" },
              { icon: DollarSign, title: "Milestone Billing", desc: "Charge per download, signup, or purchase—never double" },
              { icon: Shield, title: "Fraud Detection", desc: "IP-based rate limiting and pattern detection built in" },
              { icon: Zap, title: "Simple API", desc: "One endpoint, three event types. Integrate in minutes" },
            ].map((f) => (
              <MotionItem key={f.title}>
                <GlassCard className="glass-hover h-full p-6">
                  <f.icon className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="mb-2 font-semibold text-white/90">{f.title}</h3>
                  <p className="text-sm text-white/45">{f.desc}</p>
                </GlassCard>
              </MotionItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8">
        <div className="container text-center text-sm text-white/30">
          © {new Date().getFullYear()} Karbali. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
