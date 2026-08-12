import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SliderOffer = {
  id: string;
  title?: string | null;
  platform?: string | null;
  batch_size: number;
  flat_price_usd: number;
  competitor_name?: string | null;
  competitor_logo?: string | null;
};

/**
 * Attention-grabbing auto-rotating slider that tells the migration story:
 * "1,000 Opay users are ready to switch to <brand>".
 */
export default function SwitchOfferSlider({
  offers,
  brandName,
}: {
  offers: SliderOffer[];
  brandName: string;
}) {
  const [index, setIndex] = useState(0);
  const count = offers.length;

  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 5200);
    return () => clearInterval(t);
  }, [count]);

  if (count === 0) return null;
  const o = offers[Math.min(index, count - 1)];
  const competitor = o.competitor_name || "Competitor";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card">
      {/* Signal bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-primary/5 px-5 py-2.5">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Live switch offers
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          {count} cohort{count > 1 ? "s" : ""} available
        </span>
      </div>

      <div key={o.id} className="animate-fade-in px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Migration visual */}
          <div className="flex items-center gap-3">
            {o.competitor_logo ? (
              <img
                src={o.competitor_logo}
                alt={competitor}
                className="h-14 w-14 shrink-0 rounded-2xl border border-border object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-sm font-bold text-foreground">
                {competitor.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex flex-1 items-center gap-1.5">
              <span className="h-px w-6 bg-gradient-to-r from-border to-primary/60 sm:w-10" />
              <span className="switch-dot" />
              <span className="switch-dot [animation-delay:0.25s]" />
              <span className="switch-dot [animation-delay:0.5s]" />
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-sm font-bold text-primary">
              {brandName.slice(0, 2).toUpperCase()}
            </div>
          </div>

          {/* Story */}
          <div className="min-w-0 flex-1 lg:px-4">
            <p className="text-[1.35rem] font-semibold leading-snug tracking-tight text-foreground sm:text-[1.6rem]">
              <span className="tabular-nums text-primary">{Number(o.batch_size).toLocaleString()}</span>{" "}
              {competitor} users are ready to switch to {brandName}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 font-medium text-foreground">
                <Users className="h-3.5 w-3.5 text-primary" />
                {Number(o.batch_size).toLocaleString()} verified users
              </span>
              {o.platform && (
                <span className="rounded-full bg-secondary px-2.5 py-1 font-medium capitalize text-foreground">
                  {o.platform}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 font-medium text-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" />
                ${Number(o.flat_price_usd).toFixed(2)} one-off
              </span>
            </div>
          </div>

          <Link to="/switch-offers" className="shrink-0">
            <Button size="lg" className="w-full gap-2 rounded-full px-6 font-semibold sm:w-auto">
              Claim these users <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Controls */}
        {count > 1 && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {offers.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setIndex(i)}
                  aria-label={`Show offer ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIndex((i) => (i - 1 + count) % count)}
                aria-label="Previous offer"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIndex((i) => (i + 1) % count)}
                aria-label="Next offer"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
