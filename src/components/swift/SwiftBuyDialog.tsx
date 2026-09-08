import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Zap, Plus, Trash2 } from "lucide-react";
import { friendlyError } from "@/lib/errors";
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

  const submit = async () => {
    if (!pkg) return;
    if (!unitPrice) return toast.error(`Pick a volume between ${minUnits} and ${maxUnits} users`);
    if (chosen.length === 0 && customLines.length === 0)
      return toast.error("Pick at least one daily deliverable");
    const cleanLinks = links.map((l) => l.trim()).filter(Boolean);
    if (platform === "web" && cleanLinks.length !== 1)
      return toast.error("Choose one of your verified websites");
    if (cleanLinks.length === 0) return toast.error("Add your app or page link");
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

  return (
    <Dialog open={!!pkg} onOpenChange={(v) => !v && onClose()}>
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
                  <p className="mt-0.5 text-xs text-muted-foreground">Swift package · pay per user acquired</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 pt-4">
              {pkg.description && (
                <p className="rounded-lg border bg-secondary/40 p-3 text-sm text-muted-foreground">{pkg.description}</p>
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
              <Button variant="outline" className="h-9 text-xs" onClick={onClose}>Cancel</Button>
              <Button className="h-9 text-xs font-semibold" onClick={submit} disabled={buying || total <= 0}>
                {buying && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                {buying ? "Placing order..." : `Authorize $${total.toFixed(2)}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
