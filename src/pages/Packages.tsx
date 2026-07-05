import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Package as PackageIcon, Loader2, ShoppingCart, Wallet, CreditCard, ClipboardList, Check, Smartphone, Globe } from "lucide-react";

type Pkg = {
  id: string; name: string; description: string | null;
  category_group_id: string | null; category_id: string | null;
  min_units: number; max_units: number;
  duration_options: number[]; platform_support: string[];
};
type Milestone = { id: string; name: string; default_order: number };
type PkgMilestone = { milestone_id: string; step_order: number; price_usd: number };
type WebsiteRow = { id: string; domain: string; is_verified: boolean };
type WalletInfo = { balance: number; is_activated: boolean };

const PENDING_KEY = "karbali_pending_package_purchase";

export default function Packages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [pkgMs, setPkgMs] = useState<Record<string, PkgMilestone[]>>({});
  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Pkg | null>(null);
  const [platform, setPlatform] = useState<"mobile" | "web">("mobile");
  const [duration, setDuration] = useState<number>(30);
  const [units, setUnits] = useState<number>(500);
  const [targetMsId, setTargetMsId] = useState<string>("");
  const [links, setLinks] = useState<string[]>([""]);
  const [payMethod, setPayMethod] = useState<"wallet" | "paystack">("wallet");
  const [buying, setBuying] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: pkgs }, { data: w }, { data: ms }, { data: sites }] = await Promise.all([
      // RLS already filters to advertiser's category, no client-side filter needed
      supabase.from("ad_packages" as any).select("*").eq("is_active", true).order("sort_order").order("created_at"),
      supabase.from("wallets").select("balance, is_activated").eq("advertiser_id", user.id).maybeSingle(),
      supabase.from("milestones" as any).select("id,name,default_order").eq("is_active", true).order("default_order"),
      supabase.from("advertiser_websites").select("id, domain, is_verified").eq("advertiser_id", user.id),
    ]);
    setPackages((pkgs as any) || []);
    setWallet((w as any) || null);
    setMilestones((ms as any) || []);
    setWebsites(((sites as any) || []).filter((s: WebsiteRow) => s.is_verified));

    if ((pkgs as any)?.length) {
      const ids = (pkgs as any).map((p: any) => p.id);
      const { data: pm } = await supabase.from("package_milestones" as any).select("*").in("package_id", ids);
      const byPkg: Record<string, PkgMilestone[]> = {};
      for (const r of (pm as any) || []) {
        (byPkg[r.package_id] ||= []).push({
          milestone_id: r.milestone_id, step_order: r.step_order, price_usd: Number(r.price_usd),
        });
      }
      for (const k of Object.keys(byPkg)) byPkg[k].sort((a, b) => a.step_order - b.step_order);
      setPkgMs(byPkg);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  // Resume purchase after Paystack top-up
  useEffect(() => {
    if (searchParams.get("funded") === "package" && user) {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      sessionStorage.removeItem(PENDING_KEY);
      (async () => {
        await new Promise((r) => setTimeout(r, 1500));
        const { error } = await supabase.rpc("purchase_package_v2" as any, {
          _package_id: p.package_id, _units: p.units, _duration_days: p.duration,
          _target_milestone_id: p.target_milestone_id, _platform: p.platform, _links: p.links,
        });
        if (error) toast.error(`Payment received but purchase failed: ${error.message}`);
        else toast.success("Package purchased! Pending admin review.");
        load();
      })();
    }
    // eslint-disable-next-line
  }, [searchParams, user?.id]);

  const openBuy = (p: Pkg) => {
    setSelected(p);
    const platforms = p.platform_support || ["mobile"];
    const initPlat = (platforms.includes("mobile") ? "mobile" : "web") as "mobile" | "web";
    setPlatform(initPlat);
    setDuration((p.duration_options && p.duration_options[0]) || 30);
    setUnits(p.min_units);
    const ms = pkgMs[p.id] || [];
    setTargetMsId(ms.length > 0 ? ms[0].milestone_id : "");
    setLinks(initPlat === "web" ? [websites[0]?.domain || ""] : [""]);
    setPayMethod("wallet");
  };

  const selectedMs = selected ? (pkgMs[selected.id] || []) : [];
  const targetRow = selectedMs.find((r) => r.milestone_id === targetMsId);
  const cumulativePrice = useMemo(() => {
    if (!targetRow) return 0;
    return selectedMs.filter((r) => r.step_order <= targetRow.step_order)
      .reduce((s, r) => s + r.price_usd, 0);
  }, [selectedMs, targetRow]);
  const total = Number((units * cumulativePrice).toFixed(2));

  const submit = async () => {
    if (!selected || !user) return;
    if (units < selected.min_units || units > selected.max_units) {
      return toast.error(`Users must be between ${selected.min_units} and ${selected.max_units}`);
    }
    if (!targetMsId) return toast.error("Pick a goal milestone");
    const cleanLinks = links.map((l) => l.trim()).filter(Boolean);
    if (platform === "web") {
      if (cleanLinks.length !== 1) return toast.error("Add exactly 1 website link");
      if (!websites.some((s) => s.domain === cleanLinks[0] || cleanLinks[0].includes(s.domain))) {
        return toast.error("Website must be one of your verified sites");
      }
    } else {
      if (cleanLinks.length < 1 || cleanLinks.length > 2) return toast.error("Add 1 or 2 app links");
      for (const l of cleanLinks) { try { new URL(l); } catch { return toast.error(`Invalid URL: ${l}`); } }
    }
    if (total <= 0) return toast.error("Package pricing is invalid");

    setBuying(true);
    const args = {
      _package_id: selected.id, _units: units, _duration_days: duration,
      _target_milestone_id: targetMsId, _platform: platform, _links: cleanLinks,
    };

    if (payMethod === "wallet") {
      if (!wallet?.is_activated) { setBuying(false); return toast.error("Activate your wallet first"); }
      if ((wallet?.balance || 0) < total) { setBuying(false); return toast.error("Insufficient wallet balance"); }
      const { error } = await supabase.rpc("purchase_package_v2" as any, args);
      setBuying(false);
      if (error) return toast.error(error.message);
      toast.success("Package purchased! Pending admin review.");
      setSelected(null); load();
      return;
    }

    // Paystack: top-up wallet, then RPC on return
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({
      package_id: selected.id, units, duration, target_milestone_id: targetMsId, platform, links: cleanLinks,
    }));
    const { data, error } = await supabase.functions.invoke("paystack-wallet", {
      body: { action: "initialize_funding", amount: total, callback_origin: window.location.origin },
    });
    setBuying(false);
    if (error || (data as any)?.error) {
      sessionStorage.removeItem(PENDING_KEY);
      return toast.error((data as any)?.error || error?.message || "Payment failed");
    }
    const url = (data as any)?.authorization_url;
    if (!url) { sessionStorage.removeItem(PENDING_KEY); return toast.error("No payment URL"); }
    sessionStorage.setItem("karbali_return_to", `/packages?funded=package`);
    window.location.href = url;
  };

  return (
    <DashboardLayout>
      <MotionWrapper>
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ad Packages</h1>
            <p className="text-sm text-muted-foreground">Templates scoped to your category — pick a goal, we bundle the milestones.</p>
          </div>
          <Link to="/packages/orders">
            <Button variant="outline" size="sm"><ClipboardList className="mr-2 h-4 w-4" /> My orders</Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : packages.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
            <PackageIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
            No packages available for your category yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {packages.map((p) => {
              const ms = pkgMs[p.id] || [];
              const cheapest = ms[0];
              const fullPrice = ms.reduce((s, r) => s + r.price_usd, 0);
              return (
                <div key={p.id} className="rounded-xl border bg-card p-5 flex flex-col">
                  <h3 className="font-semibold">{p.name}</h3>
                  {p.description && <p className="mt-1.5 text-sm text-muted-foreground line-clamp-3">{p.description}</p>}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-muted-foreground">Starts from</p>
                      <p className="font-medium text-sm">${cheapest?.price_usd?.toFixed(2) ?? "—"}<span className="text-muted-foreground">/user</span></p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-muted-foreground">Full funnel</p>
                      <p className="font-medium text-sm">${fullPrice.toFixed(2)}<span className="text-muted-foreground">/user</span></p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2 col-span-2">
                      <p className="text-muted-foreground">Daily users</p>
                      <p className="font-medium text-sm">{p.min_units.toLocaleString()} – {p.max_units.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(p.platform_support || []).map((pl) => <Badge key={pl} variant="outline" className="capitalize text-[10px]">{pl}</Badge>)}
                    {(p.duration_options || []).map((d) => <Badge key={d} variant="secondary" className="text-[10px]">{d}d</Badge>)}
                  </div>
                  <Button className="mt-4" onClick={() => openBuy(p)} disabled={ms.length === 0}>
                    <ShoppingCart className="mr-2 h-4 w-4" /> {ms.length === 0 ? "Not configured" : "Buy package"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            {selected && (
              <>
                <DialogHeader><DialogTitle>{selected.name}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  {/* Platform */}
                  <div>
                    <Label>Platform</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {(selected.platform_support || []).map((pl) => (
                        <button key={pl} type="button"
                          onClick={() => { setPlatform(pl as any); setLinks(pl === "web" ? [websites[0]?.domain || ""] : [""]); }}
                          className={`rounded-lg border p-3 text-left text-sm transition ${platform === pl ? "border-primary bg-primary/5" : "hover:bg-accent"}`}>
                          {pl === "mobile" ? <Smartphone className="h-4 w-4 mb-1" /> : <Globe className="h-4 w-4 mb-1" />}
                          <p className="font-medium capitalize">{pl} app</p>
                          <p className="text-xs text-muted-foreground">{pl === "web" ? "1 verified website" : "Up to 2 app links"}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <Label>Delivery duration</Label>
                    <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(selected.duration_options || []).map((d) => (
                          <SelectItem key={d} value={String(d)}>{d} days ({d < 30 ? "short" : d >= 365 ? "yearly" : `${Math.round(d/30)} month${d>=60?"s":""}`})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">{units.toLocaleString()} users delivered daily for {duration} days.</p>
                  </div>

                  {/* Units */}
                  <div>
                    <Label>Daily users</Label>
                    <Input type="number" min={selected.min_units} max={selected.max_units} value={units}
                      onChange={(e) => setUnits(Math.max(selected.min_units, Math.min(selected.max_units, Number(e.target.value) || 0)))} />
                    <p className="mt-1 text-xs text-muted-foreground">Min {selected.min_units.toLocaleString()} · Max {selected.max_units.toLocaleString()}</p>
                  </div>

                  {/* Target milestone */}
                  <div>
                    <Label>What outcome are you buying?</Label>
                    <div className="mt-1 space-y-1.5">
                      {selectedMs.map((r) => {
                        const m = milestones.find((x) => x.id === r.milestone_id);
                        const included = targetRow && r.step_order <= targetRow.step_order;
                        return (
                          <button key={r.milestone_id} type="button" onClick={() => setTargetMsId(r.milestone_id)}
                            className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm transition ${
                              targetMsId === r.milestone_id ? "border-primary bg-primary/5" : "hover:bg-accent"
                            }`}>
                            <span className="flex items-center gap-2">
                              {included && <Check className="h-3.5 w-3.5 text-primary" />}
                              <span className={included ? "font-medium" : "text-muted-foreground"}>{m?.name || "?"}</span>
                            </span>
                            <span className="text-xs text-muted-foreground">+${r.price_usd.toFixed(2)}/user</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">Selecting a goal includes every earlier milestone — you can't skip steps.</p>
                  </div>

                  {/* Links */}
                  <div>
                    <Label>{platform === "web" ? "Website (verified only)" : "App link(s)"}</Label>
                    {platform === "web" ? (
                      websites.length === 0 ? (
                        <div className="rounded-md border border-dashed p-3 text-sm">
                          <p className="text-muted-foreground">You have no verified websites.</p>
                          <Link to="/websites"><Button size="sm" variant="link" className="px-0">Verify a website first →</Button></Link>
                        </div>
                      ) : (
                        <Select value={links[0]} onValueChange={(v) => setLinks([v])}>
                          <SelectTrigger><SelectValue placeholder="Pick a verified website" /></SelectTrigger>
                          <SelectContent>{websites.map((s) => <SelectItem key={s.id} value={s.domain}>{s.domain}</SelectItem>)}</SelectContent>
                        </Select>
                      )
                    ) : (
                      <div className="space-y-2">
                        {links.map((l, i) => (
                          <div key={i} className="flex gap-2">
                            <Input value={l} placeholder="https://play.google.com/…"
                              onChange={(e) => setLinks(links.map((x, j) => j === i ? e.target.value : x))} />
                            {links.length > 1 && (
                              <Button variant="outline" size="icon" onClick={() => setLinks(links.filter((_, j) => j !== i))}>✕</Button>
                            )}
                          </div>
                        ))}
                        {links.length < 2 && (
                          <Button variant="ghost" size="sm" onClick={() => setLinks([...links, ""])}>+ Add second link</Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="text-lg font-semibold">${total.toFixed(2)}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {units.toLocaleString()} users × ${cumulativePrice.toFixed(2)} bundled milestones · delivered over {duration} days.
                    </p>
                  </div>

                  {/* Payment */}
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setPayMethod("wallet")}
                      className={`rounded-lg border p-3 text-left text-sm transition ${payMethod === "wallet" ? "border-primary bg-primary/5" : "hover:bg-accent"}`}>
                      <Wallet className="h-4 w-4 mb-1" />
                      <p className="font-medium">Wallet</p>
                      <p className="text-xs text-muted-foreground">Balance: ${(wallet?.balance || 0).toFixed(2)}</p>
                    </button>
                    <button type="button" onClick={() => setPayMethod("paystack")}
                      className={`rounded-lg border p-3 text-left text-sm transition ${payMethod === "paystack" ? "border-primary bg-primary/5" : "hover:bg-accent"}`}>
                      <CreditCard className="h-4 w-4 mb-1" />
                      <p className="font-medium">Paystack</p>
                      <p className="text-xs text-muted-foreground">Card / bank</p>
                    </button>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                  <Button onClick={submit} disabled={buying || total <= 0 || (platform === "web" && websites.length === 0)}>
                    {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay $${total.toFixed(2)}`}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </MotionWrapper>
    </DashboardLayout>
  );
}
