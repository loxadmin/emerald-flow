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
    <section className="relative overflow-hidden rounded-xl border border-navy-border bg-navy">
      <div key={o.id} className="animate-fade-in flex items-center gap-3 px-3 py-2.5">
        {/* competitor → you */}
        <div className="flex shrink-0 items-center gap-1.5">
          {o.competitor_logo ? (
            <img
              src={o.competitor_logo}
              alt={competitor}
              className="h-7 w-7 rounded-lg border border-white/10 bg-white/5 object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-navy-foreground">
              {competitor.slice(0, 2).toUpperCase()}
            </div>
          )}
          <ArrowRight className="h-3 w-3 text-emerald-400" />
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-[10px] font-bold text-emerald-300">
            {brandName.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* one-line story */}
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-navy-foreground">
          <span className="tabular-nums font-semibold text-emerald-300">
            {Number(o.batch_size).toLocaleString()}
          </span>{" "}
          {competitor} users ready to switch to {brandName}
          <span className="text-navy-muted"> · ${Number(o.flat_price_usd).toFixed(2)}</span>
        </p>

        <Link to="/switch-offers" className="shrink-0">
          <Button
            size="sm"
            className="h-7 rounded-full bg-emerald-500 px-3 text-xs font-semibold text-white hover:bg-emerald-400"
          >
            Claim
          </Button>
        </Link>

        {count > 1 && (
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            {offers.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setIndex(i)}
                aria-label={`Show offer ${i + 1}`}
                className={`h-1 rounded-full transition-all ${
                  i === index ? "w-4 bg-emerald-400" : "w-1 bg-white/25 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

