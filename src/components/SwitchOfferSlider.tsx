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
 * Compact, attention-grabbing switch-offer display card.
 * Dark navy surface with a migration story: competitor users → your brand.
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
    <section className="relative overflow-hidden rounded-2xl border border-navy-border bg-navy shadow-lg shadow-black/20">
      {/* Top signal bar */}
      <div className="flex items-center justify-between gap-3 border-b border-navy-border/70 bg-white/[0.03] px-4 py-2">
        <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-foreground/90">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Live switch offers
        </span>
        <span className="text-[10px] font-medium text-navy-muted">
          {count} cohort{count > 1 ? "s" : ""}
        </span>
      </div>

      <div key={o.id} className="animate-fade-in px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Compact migration visual */}
          <div className="flex items-center gap-2.5">
            {o.competitor_logo ? (
              <img
                src={o.competitor_logo}
                alt={competitor}
                className="h-10 w-10 shrink-0 rounded-xl border border-white/10 object-cover bg-white/5"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-navy-foreground">
                {competitor.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex flex-1 items-center gap-1">
              <span className="h-px w-5 bg-gradient-to-r from-navy-border to-emerald-400/60" />
              <span className="switch-dot" />
              <span className="switch-dot [animation-delay:0.25s]" />
              <span className="switch-dot [animation-delay:0.5s]" />
              <ArrowRight className="h-3 w-3 text-emerald-400" />
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-xs font-bold text-emerald-300">
              {brandName.slice(0, 2).toUpperCase()}
            </div>
          </div>

          {/* Story */}
          <div className="min-w-0 flex-1 sm:px-3">
            <p className="text-sm font-semibold leading-snug tracking-tight text-navy-foreground sm:text-base">
              <span className="tabular-nums text-emerald-300">{Number(o.batch_size).toLocaleString()}</span>{" "}
              {competitor} users are ready to switch to {brandName}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2 py-1 font-medium text-navy-foreground/90 ring-1 ring-white/10">
                <Users className="h-3 w-3 text-emerald-300" />
                {Number(o.batch_size).toLocaleString()} verified
              </span>
              {o.platform && (
                <span className="rounded-full bg-white/[0.06] px-2 py-1 font-medium capitalize text-navy-foreground/90 ring-1 ring-white/10">
                  {o.platform}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2 py-1 font-medium text-navy-foreground/90 ring-1 ring-white/10">
                <Zap className="h-3 w-3 text-emerald-300" />
                ${Number(o.flat_price_usd).toFixed(2)}
              </span>
            </div>
          </div>

          <Link to="/switch-offers" className="shrink-0">
            <Button
              size="sm"
              className="w-full gap-2 rounded-full bg-emerald-500 px-4 font-semibold text-white hover:bg-emerald-400 sm:w-auto"
            >
              Claim <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Controls */}
        {count > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-navy-border/50 pt-3">
            <div className="flex items-center gap-1.5">
              {offers.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setIndex(i)}
                  aria-label={`Show offer ${i + 1}`}
                  className={`h-1 rounded-full transition-all ${
                    i === index ? "w-5 bg-emerald-400" : "w-1 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIndex((i) => (i - 1 + count) % count)}
                aria-label="Previous offer"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-navy-muted transition-colors hover:bg-white/5 hover:text-navy-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIndex((i) => (i + 1) % count)}
                aria-label="Next offer"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-navy-muted transition-colors hover:bg-white/5 hover:text-navy-foreground"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
