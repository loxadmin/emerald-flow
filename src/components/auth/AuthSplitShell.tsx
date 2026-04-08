import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Shield, Target, Wallet } from "lucide-react";
import FluidCanvas from "@/components/FluidCanvas";
import Logo from "@/components/Logo";

interface AuthSplitShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

const benefits = [
  {
    icon: Target,
    title: "Verified acquisition",
    description: "Track migrations from competitor brands into your own growth funnel with measurable outcomes.",
  },
  {
    icon: Shield,
    title: "Domain-locked tracking",
    description: "Keep campaign API usage tied to the exact website approved for each advertiser campaign.",
  },
  {
    icon: BarChart3,
    title: "Real analytics",
    description: "Clicks, signups, and purchase events are built for advertisers who care about actual conversion flow.",
  },
  {
    icon: Wallet,
    title: "Wallet activation",
    description: "Run campaigns with controlled funding, verified payment flow, and advertiser-ready account controls.",
  },
];

const snapshots = [
  { label: "Tracking", value: "Real-time" },
  { label: "Security", value: "Domain locked" },
  { label: "Payments", value: "Wallet ready" },
];

export default function AuthSplitShell({ eyebrow, title, description, children, footer }: AuthSplitShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <FluidCanvas />

      <div className="relative z-10 min-h-screen px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-border/30 bg-background/70 backdrop-blur-sm lg:grid-cols-[1.05fr_0.95fr]">
          <section className="flex flex-col justify-between border-b border-border/20 px-6 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
            <div>
              <Link to="/" className="inline-flex items-center gap-3">
                <Logo size={36} />
                <span className="text-2xl font-semibold tracking-tight text-gradient">Karbali</span>
              </Link>

              <div className="mt-12 max-w-xl">
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                  Advertising infrastructure
                </p>
                <h2 className="mt-4 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
                  Acquire competitor customers with verified outcomes.
                </h2>
                <p className="mt-6 text-base leading-7 text-muted-foreground sm:text-lg">
                  Domain-locked event tracking, wallet activation, and measurable growth built for serious advertisers.
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {benefits.map(({ icon: Icon, title: benefitTitle, description: benefitDescription }) => (
                  <div key={benefitTitle} className="rounded-[1.5rem] border border-border/25 bg-background/70 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">{benefitTitle}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{benefitDescription}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {snapshots.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/25 bg-card/90 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-base font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-center justify-center px-4 py-8 sm:px-8 lg:px-10">
            <div className="w-full max-w-xl rounded-[1.75rem] border border-border/25 bg-card p-6 shadow-[0_24px_80px_hsl(var(--foreground)/0.08)] sm:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">{eyebrow}</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-card-foreground sm:text-4xl">{title}</h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">{description}</p>

              <div className="mt-8">{children}</div>

              <div className="mt-6 border-t border-border/20 pt-6 text-sm text-muted-foreground">{footer}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
