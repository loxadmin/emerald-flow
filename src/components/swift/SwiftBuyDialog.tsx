import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Zap, Plus, Trash2, Gift } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import GiftBox from "@/components/GiftBox";
import {
  type SwiftTier,
  type SwiftAction,
  type SwiftPkgAction,
  tierPriceFor,
  swiftMinUnits,
  swiftMaxUnits,
  swiftTotal,
} from "@/lib/swift";

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  duration_options: number[];
  platform_support: string[];
  swift_trial_units?: number | null;
  swift_trial_free_days?: number | null;
  swift_churn_units?: number | null;
  swift_churn_discount_pct?: number | null;
};

type CustomRow = { name: string; price: string };

type Props = {
  pkg: Pkg | null;
  tiers: SwiftTier[];
  presets: SwiftAction[];
  pkgActions: SwiftPkgAction[];
  websites: { id: string; domain: string }[];
  walletBalance: number;
  onClose: () => void;
  onDone: () => void;
};

const REASONS = [
  "The price is too high",
  "I need more users than this",
  "I'm not ready to launch yet",
  "I don't understand how it works",
  "The daily activities don't fit my app",
  "Something else",
];

/** Cheapest per-user price we can charge for a very small trial volume. */
function trialUnitPrice(tiers: SwiftTier[], units: number): number | null {
  const exact = tierPriceFor(tiers, units);
  if (exact != null) return exact;
  if (!tiers.length) return null;
  const lowest = [...tiers].sort((a, b) => a.min_units - b.min_units)[0];
  return Number(lowest.price_per_user_usd);
}

export default function SwiftBuyDialog({
  pkg, tiers, presets, pkgActions, websites, walletBalance, onClose, onDone,
}: Props) {
  const minUnits = swiftMinUnits(tiers);
  const maxUnits = swiftMaxUnits(tiers);

  const [platform, setPlatform] = useState("mobile");
  const [duration, setDuration] = useState(30);
  const [unitsText, setUnitsText] = useState(String(minUnits));
  const [actionIds, setActionIds] = useState<string[]>([]);
  const [customs, setCustoms] = useState<CustomRow[]>([]);
  const [links, setLinks] = useState<string[]>([""]);
  const [buying, setBuying] = useState(false);

  // churn flow
  const [churnOpen, setChurnOpen] = useState(false);
  const [churnPkg, setChurnPkg] = useState<Pkg | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [reasonSent, setReasonSent] = useState(false);
  const [churnBusy, setChurnBusy] = useState(false);
  const [churnPlatform, setChurnPlatform] = useState("mobile");
  const [churnLinks, setChurnLinks] = useState<string[]>([""]);

  useEffect(() => {
    if (!pkg) return;
    setPlatform(pkg.platform_support?.[0] || "mobile");
    setDuration(pkg.duration_options?.[0] || 30);
    setUnitsText(String(minUnits));
    setActionIds([]);
    setCustoms([]);
    setLinks([""]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg?.id]);

  const units = Math.max(0, Math.floor(Number(unitsText) || 0));
  const unitPrice = tierPriceFor(tiers, units);

  const trialUnits = Math.max(1, Number(pkg?.swift_trial_units ?? 10));
  const freeDays = Math.max(1, Number(pkg?.swift_trial_free_days ?? 3));
  const trialPer = trialUnitPrice(tiers, trialUnits);
  const trialCost = trialPer != null ? Number((trialPer * trialUnits).toFixed(2)) : null;

  const churnSource = churnPkg || pkg;
  const churnUnits = Math.max(1, Number(churnSource?.swift_churn_units ?? 5));
  const churnPct = Math.min(90, Math.max(0, Number(churnSource?.swift_churn_discount_pct ?? 0)));
  const churnPer = trialUnitPrice(tiers, churnUnits);
  const churnCost = churnPer != null ? Number((churnPer * (1 - churnPct / 100) * churnUnits).toFixed(2)) : null;

  const available = useMemo(
    () =>
      pkgActions
        .map((pa) => {
          const preset = presets.find((p) => p.id === pa.action_id);
          if (!preset || !preset.is_active) return null;
          return {
            id: preset.id,
            name: preset.name,
            price: pa.price_override_usd ?? Number(preset.price_per_user_per_day),
          };
        })
        .filter(Boolean) as { id: string; name: string; price: number }[],
    [pkgActions, presets],
  );

  const chosen = available.filter((a) => actionIds.includes(a.id));
  const customLines = customs
    .filter((c) => c.name.trim() && Number(c.price) >= 0 && c.price !== "")
    .map((c) => ({ name: c.name.trim(), price: Number(c.price) }));

  const allLines = [...chosen, ...customLines].map((l) => ({ price_per_user_per_day: l.price }));
  const { base, daily, total } = swiftTotal(unitPrice || 0, units, duration, allLines);

  const checkLinks = (pl: string, raw: string[]) => {
    const clean = raw.map((l) => l.trim()).filter(Boolean);
    if (pl === "web" && clean.length !== 1) {
      toast.error("Choose one of your verified websites");
      return null;
    }
    if (clean.length === 0) {
      toast.error("Add your app or page link");
      return null;
    }
    return clean;
  };

  /** Closing without buying opens the "why not?" prompt. */
  const handleWalkAway = () => {
    if (pkg) {
      setChurnPkg(pkg);
      setReason(null);
      setReasonSent(false);
      setChurnPlatform(pkg.platform_support?.[0] || "mobile");
      setChurnLinks([""]);
      setChurnOpen(true);
    }
    onClose();
  };

  const submit = async () => {
    if (!pkg) return;
    if (!unitPrice) return toast.error(`Pick a volume between ${minUnits} and ${maxUnits} users`);
    if (chosen.length === 0 && customLines.length === 0)
      return toast.error("Pick at least one daily deliverable");
    const cleanLinks = checkLinks(platform, links);
    if (!cleanLinks) return;
    if (walletBalance < total) return toast.error("Top up your wallet to cover this order");

    setBuying(true);
    const { data, error } = await supabase.rpc("purchase_swift_package" as never, {
      _package_id: pkg.id,
      _units: units,
      _duration_days: duration,
      _action_ids: chosen.map((c) => c.id),
      _custom: customLines.map((c) => ({ name: c.name, price_per_user_per_day: c.price })),
      _platform: platform,
      _links: cleanLinks,
    } as never);
    setBuying(false);
    if (error) return toast.error(friendlyError(error));
    const orderId = (data as { order_id?: string } | null)?.order_id;
    if (orderId) {
      supabase.functions
        .invoke("notify", { body: { event: "package_order_submitted", payload: { order_id: orderId } } })
        .catch(() => {});
    }
    toast.success(
      customLines.length
        ? "Order placed. Your custom deliverable goes to review — you may be asked to approve a change."
        : "Order placed! Approval takes 3–7 business days.",
    );
    onDone();
  };

  const startTrial = async (variant: "standard" | "churn") => {
    const target = variant === "churn" ? churnPkg : pkg;
    if (!target) return;
    const pl = variant === "churn" ? churnPlatform : platform;
    const cleanLinks = checkLinks(pl, variant === "churn" ? churnLinks : links);
    if (!cleanLinks) return;
    const cost = variant === "churn" ? churnCost : trialCost;
    if (cost == null) return toast.error("This trial isn't priced yet");
    if (walletBalance < cost) return toast.error("Top up your wallet to cover this trial");

    variant === "churn" ? setChurnBusy(true) : setBuying(true);
    const { data, error } = await supabase.rpc("purchase_swift_trial" as never, {
      _package_id: target.id,
      _variant: variant,
      _platform: pl,
      _links: cleanLinks,
    } as never);
    variant === "churn" ? setChurnBusy(false) : setBuying(false);
    if (error) return toast.error(friendlyError(error));
    const orderId = (data as { order_id?: string } | null)?.order_id;
    if (orderId) {
      supabase.functions
        .invoke("notify", { body: { event: "package_order_submitted", payload: { order_id: orderId } } })
        .catch(() => {});
    }
    toast.success("Trial booked! Approval takes 3–7 business days.");
    setChurnOpen(false);
    setChurnPkg(null);
    onDone();
  };

  const sendReason = async () => {
    if (!reason || !churnPkg) return toast.error("Pick a reason so we can help");
    setChurnBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (uid) {
      await supabase.from("swift_churn_feedback" as never).insert({
        advertiser_id: uid,
        package_id: churnPkg.id,
        reason,
      } as never);
    }
    setChurnBusy(false);
    setReasonSent(true);
  };

  return (
    <>
      <Dialog open={!!pkg} onOpenChange={(v) => !v && handleWalkAway()}>
        <DialogContent className="max-w-xl max-h-[95vh] overflow-y-auto bg-card p-5 md:p-6">
          {pkg && (
            <>
              <DialogHeader className="border-b border-border/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <DialogTitle className="text-base font-semibold">{pkg.name}</DialogTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">Swift package · pay per user acquired · one per advertiser</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 pt-4">
                {pkg.description && (
                  <p className="rounded-lg border bg-secondary/40 p-3 text-sm text-muted-foreground">{pkg.description}</p>
                )}

                {/* Trial offer */}
                {trialCost != null && (
                  <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5">
                    <GiftBox size={44} tone="red" shake />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        Try this package with {trialUnits} users for ${trialCost.toFixed(2)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Includes {freeDays} days of daily activity, free.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="shrink-0 font-semibold"
                      disabled={buying}
                      onClick={() => startTrial("standard")}
                    >
                      <Gift className="mr-1 h-3.5 w-3.5" /> Try it
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Users to acquire</Label>
                    <Input
                      type="number"
                      min={minUnits}
                      max={maxUnits}
                      value={unitsText}
                      onChange={(e) => setUnitsText(e.target.value)}
                      className="h-9 text-xs font-semibold"
                    />
                    <p className="text-[9px] text-muted-foreground">
                      {minUnits.toLocaleString()} – {maxUnits.toLocaleString()} users ·{" "}
                      {unitPrice ? `$${unitPrice.toFixed(2)} per user at this volume` : "no price range covers this volume"}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Duration</Label>
                    <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                      <SelectTrigger className="h-9 text-xs font-semibold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(pkg.duration_options || [30]).map((d) => (
                          <SelectItem key={d} value={String(d)} className="text-xs">{d} days</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Volume pricing</Label>
                  <div className="grid gap-1">
                    {[...tiers].sort((a, b) => b.min_units - a.min_units).map((t, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between rounded-md border px-3 py-1.5 text-xs ${
                          unitPrice != null && units >= t.min_units && units <= t.max_units
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/40 bg-secondary/10"
                        }`}
                      >
                        <span className="text-muted-foreground">
                          {t.min_units.toLocaleString()} – {t.max_units.toLocaleString()} users
                        </span>
                        <span className="font-semibold text-foreground">${Number(t.price_per_user_usd).toFixed(2)} / user</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Daily deliverables</Label>
                  {available.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">No preset actions on this package.</p>
                  ) : (
                    <div className="space-y-2">
                      {available.map((a) => {
                        const checked = actionIds.includes(a.id);
                        return (
                          <label
                            key={a.id}
                            className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-xs ${
                              checked ? "border-primary/40 bg-primary/5" : "border-border/40 bg-secondary/10"
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() =>
                                  setActionIds((ids) =>
                                    ids.includes(a.id) ? ids.filter((x) => x !== a.id) : [...ids, a.id],
                                  )
                                }
                              />
                              <span className="font-semibold text-foreground">{a.name}</span>
                            </span>
                            <span className="font-semibold text-foreground/90">${a.price.toFixed(2)} / user / day</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2 rounded-lg border border-dashed p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold">Your own daily deliverable</Label>
                      <p className="text-[10px] text-muted-foreground">
                        e.g. 30 game levels per user per day. Our team may adjust the price or decline it.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setCustoms([...customs, { name: "", price: "" }])}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                  {customs.map((c, i) => (
                    <div key={i} className="grid grid-cols-[1fr_110px_36px] gap-2">
                      <Input
                        placeholder="What should users do daily?"
                        value={c.name}
                        onChange={(e) => setCustoms(customs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                        className="h-9 text-xs"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="$/user/day"
                        value={c.price}
                        onChange={(e) => setCustoms(customs.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))}
                        className="h-9 text-xs"
                      />
                      <Button size="icon" variant="ghost" onClick={() => setCustoms(customs.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Destination</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(pkg.platform_support || ["mobile"]).map((pl) => (
                      <button
                        key={pl}
                        type="button"
                        onClick={() => { setPlatform(pl); setLinks([""]); }}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize ${
                          platform === pl ? "border-primary bg-primary/5 text-foreground" : "border-border/40 bg-secondary/10 text-muted-foreground"
                        }`}
                      >
                        {pl}
                      </button>
                    ))}
                  </div>
                  {platform === "web" ? (
                    websites.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-2.5 text-center text-xs">
                        <p className="font-semibold text-muted-foreground">No verified websites.</p>
                        <Link to="/websites" className="text-primary underline">Verify a domain</Link>
                      </div>
                    ) : (
                      <Select value={links[0]} onValueChange={(v) => setLinks([v])}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select verified website" /></SelectTrigger>
                        <SelectContent>
                          {websites.map((s) => <SelectItem key={s.id} value={s.domain} className="text-xs">{s.domain}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )
                  ) : (
                    <div className="space-y-1.5">
                      {links.map((l, i) => (
                        <Input
                          key={i}
                          value={l}
                          placeholder="https://..."
                          className="h-9 text-xs"
                          onChange={(e) => setLinks(links.map((x, j) => (j === i ? e.target.value : x)))}
                        />
                      ))}
                      {platform === "mobile" && links.length < 2 && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary" onClick={() => setLinks([...links, ""])}>
                          + Add link
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 rounded-lg border bg-secondary/20 p-3.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Users acquired ({units.toLocaleString()} × ${(unitPrice || 0).toFixed(2)})</span>
                    <span className="font-semibold text-foreground">${base.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Daily activity ({duration} days)</span>
                    <span className="font-semibold text-foreground">${daily.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/20 pt-2">
                    <span className="text-xs font-semibold text-muted-foreground">Held in escrow</span>
                    <span className="text-lg font-bold text-foreground">${total.toFixed(2)}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Wallet balance ${walletBalance.toFixed(2)}</Badge>
                </div>
              </div>

              <DialogFooter className="mt-5 gap-2 border-t border-border/20 pt-4">
                <Button variant="outline" className="h-9 text-xs" onClick={handleWalkAway}>Cancel</Button>
                <Button className="h-9 text-xs font-semibold" onClick={submit} disabled={buying || total <= 0}>
                  {buying && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                  {buying ? "Placing order..." : `Authorize $${total.toFixed(2)}`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Why did you walk away? */}
      <Dialog open={churnOpen} onOpenChange={(v) => { if (!v) { setChurnOpen(false); setChurnPkg(null); } }}>
        <DialogContent className="max-w-md bg-card p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {reasonSent ? "Then let's start much smaller" : "Before you go — what held you back?"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {reasonSent
                ? "A tiny taster so you can see the results for yourself."
                : "Tell us why and we'll see what we can do."}
            </DialogDescription>
          </DialogHeader>

          {!reasonSent ? (
            <div className="space-y-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left text-xs font-medium ${
                    reason === r ? "border-primary bg-primary/5 text-foreground" : "border-border/40 bg-secondary/10 text-muted-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
              <DialogFooter className="pt-2">
                <Button variant="outline" className="h-9 text-xs" onClick={() => { setChurnOpen(false); setChurnPkg(null); }}>
                  No thanks
                </Button>
                <Button className="h-9 text-xs font-semibold" disabled={churnBusy || !reason} onClick={sendReason}>
                  {churnBusy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Continue
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5">
                <GiftBox size={48} tone="red" shake />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {churnUnits} users for ${churnCost != null ? churnCost.toFixed(2) : "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {churnPct}% off, with {freeDays} free days of daily activity.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Destination</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(churnPkg?.platform_support || ["mobile"]).map((pl) => (
                    <button
                      key={pl}
                      type="button"
                      onClick={() => { setChurnPlatform(pl); setChurnLinks([""]); }}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize ${
                        churnPlatform === pl ? "border-primary bg-primary/5 text-foreground" : "border-border/40 bg-secondary/10 text-muted-foreground"
                      }`}
                    >
                      {pl}
                    </button>
                  ))}
                </div>
                {churnPlatform === "web" ? (
                  websites.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-2.5 text-center text-xs">
                      <p className="font-semibold text-muted-foreground">No verified websites.</p>
                      <Link to="/websites" className="text-primary underline">Verify a domain</Link>
                    </div>
                  ) : (
                    <Select value={churnLinks[0]} onValueChange={(v) => setChurnLinks([v])}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select verified website" /></SelectTrigger>
                      <SelectContent>
                        {websites.map((s) => <SelectItem key={s.id} value={s.domain} className="text-xs">{s.domain}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )
                ) : (
                  <Input
                    value={churnLinks[0]}
                    placeholder="https://..."
                    className="h-9 text-xs"
                    onChange={(e) => setChurnLinks([e.target.value])}
                  />
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" className="h-9 text-xs" onClick={() => { setChurnOpen(false); setChurnPkg(null); }}>
                  Maybe later
                </Button>
                <Button
                  variant="destructive"
                  className="h-9 text-xs font-semibold"
                  disabled={churnBusy || churnCost == null}
                  onClick={() => startTrial("churn")}
                >
                  {churnBusy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                  Take it for ${churnCost != null ? churnCost.toFixed(2) : "—"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
