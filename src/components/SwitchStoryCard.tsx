import { ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Story-driven switch offer card: "1,000 Opay users are ready to switch to Cabally".
 * The competitor logo migrates visually towards the advertiser's brand.
 */
export default function SwitchStoryCard({
  competitorName,
  competitorLogo,
  brandName,
  count,
  price,
  platform,
  note,
  actionLabel = "Claim these users",
  onAction,
}: {
  competitorName: string;
  competitorLogo?: string | null;
  brandName: string;
  count: number;
  price: number;
  platform?: string | null;
  note?: string | null;
  actionLabel?: string;
  onAction: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-lg">
      <div className="flex items-center gap-3">
        {competitorLogo ? (
          <img src={competitorLogo} alt={competitorName} className="h-11 w-11 rounded-xl border border-border object-cover" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-foreground">
            {competitorName.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex flex-1 items-center gap-1.5 px-1">
          <span className="h-px flex-1 bg-gradient-to-r from-border to-primary/60" />
          <span className="switch-dot" />
          <span className="switch-dot [animation-delay:0.25s]" />
          <span className="switch-dot [animation-delay:0.5s]" />
          <ArrowRight className="h-4 w-4 text-primary" />
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
          {brandName.slice(0, 2).toUpperCase()}
        </div>
      </div>

      <p className="mt-4 text-lg font-semibold leading-snug tracking-tight text-foreground">
        {count.toLocaleString()} {competitorName} users are ready to switch to {brandName}
      </p>
      {note && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{note}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 font-medium text-foreground">
          <Users className="h-3.5 w-3.5 text-primary" /> {count.toLocaleString()} verified users
        </span>
        {platform && (
          <span className="rounded-full bg-secondary px-2.5 py-1 font-medium capitalize text-foreground">{platform}</span>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <div>
          <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground">${price.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">one-off migration fee</p>
        </div>
        <Button size="sm" className="gap-1.5 rounded-full px-4 font-semibold" onClick={onAction}>
          {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
