import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Shield, Target, BarChart3, Activity } from "lucide-react";
import Logo from "@/components/Logo";

interface AuthSplitShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

const benefits = [
  { icon: Target, text: "Verified customer acquisition" },
  { icon: Shield, text: "Domain-locked campaign tracking" },
  { icon: BarChart3, text: "Pay only for real conversions" },
];

export default function AuthSplitShell({ eyebrow, title, description, children, footer }: AuthSplitShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[1fr,1.1fr]">
        {/* Left — cinematic branding panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden lg:flex">
          {/* Video background */}
          <div className="absolute inset-0">
            <video
              src="/hero-animation.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/80" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          </div>

          {/* Grid overlay */}
          <div className="pointer-events-none absolute inset-0 futuristic-grid opacity-40" />

          <div className="relative z-10 p-10 xl:p-14">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <Logo size={28} />
              <span className="text-xl font-bold tracking-tight text-white">Karbali</span>
            </Link>
          </div>

          <div className="relative z-10 p-10 xl:p-14">
            <div className="futuristic-label mb-6">
              <Activity className="h-3 w-3" />
              Advertising Infrastructure
            </div>
            <h2 className="text-3xl font-bold leading-tight text-white xl:text-4xl">
              Acquire competitor customers with verified outcomes.
            </h2>
            <p className="mt-4 text-base leading-7 text-white/60">
              Domain-locked tracking, wallet activation, and measurable growth for serious advertisers.
            </p>

            <div className="mt-8 space-y-3">
              {benefits.map((b) => (
                <div key={b.text} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                    <b.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-white/80">{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 p-10 xl:p-14 text-xs text-white/30">
            &copy; {new Date().getFullYear()} Karbali. All rights reserved.
          </p>
        </div>

        {/* Right — form panel */}
        <div className="flex flex-col">
          {/* Mobile logo bar */}
          <div className="flex items-center justify-between px-5 pt-5 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2">
              <Logo size={24} />
              <span className="text-lg font-bold tracking-tight text-gradient">Karbali</span>
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
            <div className="w-full max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{eyebrow}</p>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

              <div className="mt-8">{children}</div>

              <div className="mt-6 border-t border-border/30 pt-5 text-sm text-muted-foreground">{footer}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
