import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import {
  type SwiftTier,
  type SwiftAction,
  type SwiftPkgAction,
  sortTiers,
  swiftStartingPrice,
  swiftMaxUnits,
} from "@/lib/swift";

type Props = {
  tiers: SwiftTier[];
  setTiers: (t: SwiftTier[]) => void;
  presets: SwiftAction[];
  pkgActions: SwiftPkgAction[];
  setPkgActions: (a: SwiftPkgAction[]) => void;
  swiftTrialUnits?: string;
  setSwiftTrialUnits?: (v: string) => void;
  swiftTrialFreeDays?: string;
  setSwiftTrialFreeDays?: (v: string) => void;
  swiftChurnUnits?: string;
  setSwiftChurnUnits?: (v: string) => void;
  swiftChurnDiscountPct?: string;
  setSwiftChurnDiscountPct?: (v: string) => void;
};

export default function SwiftPackageEditor({
  tiers, setTiers, presets, pkgActions, setPkgActions,
  swiftTrialUnits = "10", setSwiftTrialUnits,
  swiftTrialFreeDays = "3", setSwiftTrialFreeDays,
  swiftChurnUnits = "5", setSwiftChurnUnits,
  swiftChurnDiscountPct = "20", setSwiftChurnDiscountPct,
}: Props) {
  const update = (i: number, patch: Partial<SwiftTier>) => {
    const next = [...tiers];
    next[i] = { ...next[i], ...patch };
    setTiers(next);
  };

  const addTier = () =>
    setTiers([...tiers, { min_units: 10, max_units: 19, price_per_user_usd: 2.8 }]);

  const toggleAction = (id: string) => {
    setPkgActions(
      pkgActions.some((a) => a.action_id === id)
        ? pkgActions.filter((a) => a.action_id !== id)
        : [...pkgActions, { action_id: id, price_override_usd: null }],
    );
  };

  const setOverride = (id: string, value: string) => {
    setPkgActions(
      pkgActions.map((a) =>
        a.action_id === id
          ? { ...a, price_override_usd: value === "" ? null : Number(value) }
          : a,
      ),
    );
  };

  const starting = swiftStartingPrice(tiers);
  const maxUnits = swiftMaxUnits(tiers);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Price per user acquired</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Bigger volumes pay less per user. Ranges must not overlap.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={addTier}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add range
          </Button>
        </div>

        {tiers.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">No ranges yet.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_36px] gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>From users</span>
              <span>To users</span>
              <span>$ per user</span>
              <span />
            </div>
            {sortTiers(tiers).map((t) => {
              const i = tiers.indexOf(t);
              return (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_36px] gap-2 items-center">
                  <Input
                    type="number"
                    value={t.min_units}
                    onChange={(e) => update(i, { min_units: Number(e.target.value) || 0 })}
                  />
                  <Input
                    type="number"
                    value={t.max_units}
                    onChange={(e) => update(i, { max_units: Number(e.target.value) || 0 })}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={t.price_per_user_usd}
                    onChange={(e) => update(i, { price_per_user_usd: Number(e.target.value) || 0 })}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {starting != null && maxUnits > 0 && (
          <div className="rounded-md border bg-secondary/30 p-2.5 text-xs">
            <p className="font-semibold text-foreground">Offer card preview</p>
            <p className="mt-0.5 text-muted-foreground">
              Get up to {maxUnits.toLocaleString()} daily users · starting price ${starting.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg border p-3 space-y-3">
        <div>
          <Label className="font-semibold">Trial & Walk-away Churn Offer Settings</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Configure the default trial offer and the discounted walk-away offer when advertisers hesitate.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Trial Volume (users)</Label>
            <Input
              type="number"
              min={1}
              value={swiftTrialUnits}
              onChange={(e) => setSwiftTrialUnits?.(e.target.value)}
              className="h-8 text-xs mt-1"
              placeholder="10"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">e.g. 10 users</p>
          </div>
          <div>
            <Label className="text-xs">Free Daily Activity (days)</Label>
            <Input
              type="number"
              min={1}
              value={swiftTrialFreeDays}
              onChange={(e) => setSwiftTrialFreeDays?.(e.target.value)}
              className="h-8 text-xs mt-1"
              placeholder="3"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">e.g. 3 days free</p>
          </div>
          <div>
            <Label className="text-xs">Churn Trial Volume (users)</Label>
            <Input
              type="number"
              min={1}
              value={swiftChurnUnits}
              onChange={(e) => setSwiftChurnUnits?.(e.target.value)}
              className="h-8 text-xs mt-1"
              placeholder="5"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">Adjusted offer for hesitant users</p>
          </div>
          <div>
            <Label className="text-xs">Churn Discount Rate (%)</Label>
            <Input
              type="number"
              min={0}
              max={90}
              value={swiftChurnDiscountPct}
              onChange={(e) => setSwiftChurnDiscountPct?.(e.target.value)}
              className="h-8 text-xs mt-1"
              placeholder="20"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">Discount percentage set by admin</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-3">
        <div>
          <Label>Daily actions available on this package</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Advertisers pick what users should do each day. Leave the price blank to use your preset price.
          </p>
        </div>
        {presets.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">
            No daily action presets yet — create them in the Daily actions tab.
          </p>
        ) : (
          <div className="space-y-2">
            {presets.map((a) => {
              const picked = pkgActions.find((x) => x.action_id === a.id);
              return (
                <div key={a.id} className="grid grid-cols-[1fr_120px] items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={!!picked} onCheckedChange={() => toggleAction(a.id)} />
                    <span>{a.name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      ${Number(a.price_per_user_per_day).toFixed(2)}/user/day
                    </Badge>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    disabled={!picked}
                    placeholder="override $"
                    value={picked?.price_override_usd ?? ""}
                    onChange={(e) => setOverride(a.id, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
