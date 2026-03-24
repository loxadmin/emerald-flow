import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, Shield, Zap, DollarSign } from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-xl font-bold"><span className="text-gradient">Karbali</span></h1>
          <div className="flex gap-3">
            <Link to="/login"><Button variant="ghost">Sign In</Button></Link>
            <Link to="/signup"><Button>Get Started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Performance Attribution
          <br />
          <span className="text-gradient">That Actually Works</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Track downloads, signups, and purchases. Pay only for real results. No clicks, no impressions—just outcomes.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/signup"><Button size="lg">Start Free</Button></Link>
          <Link to="/docs"><Button size="lg" variant="outline">View API Docs</Button></Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-bold">Why Karbali?</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BarChart3, title: "Real-Time Analytics", desc: "Track every event as it happens across web and mobile" },
              { icon: DollarSign, title: "Milestone Billing", desc: "Charge per download, signup, or purchase—never double" },
              { icon: Shield, title: "Fraud Detection", desc: "IP-based rate limiting and pattern detection built in" },
              { icon: Zap, title: "Simple API", desc: "One endpoint, three event types. Integrate in minutes" },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-6">
                <f.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Karbali. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
