import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Package as PackageIcon, Loader2, ShoppingCart, Wallet, CreditCard, ClipboardList, Smartphone, Globe, Lock, Youtube, Music, Instagram, Video } from "lucide-react";

const PLATFORM_META: Record<string, { label: string; sub: string; Icon: any; placeholder: string }> = {
  mobile:    { label: "Mobile app", sub: "Up to 2 app links, install required", Icon: Smartphone, placeholder: "https://play.google.com/..." },
  web:       { label: "Website",    sub: "1 verified website",                  Icon: Globe,      placeholder: "https://yourdomain.com" },
  youtube:   { label: "YouTube",    sub: "1 channel or video link",             Icon: Youtube,    placeholder: "https://youtube.com/@yourchannel" },
  spotify:   { label: "Spotify",    sub: "1 artist or track link",              Icon: Music,      placeholder: "https://open.spotify.com/artist/..." },
  instagram: { label: "Instagram",  sub: "1 profile link",                      Icon: Instagram,  placeholder: "https://instagram.com/yourhandle" },
  tiktok:    { label: "TikTok",     sub: "1 profile or video link",             Icon: Video,      placeholder: "https://tiktok.com/@yourhandle" },
};
const CREATOR_PLATFORMS = ["youtube", "spotify", "instagram", "tiktok"];

import { subtypeLabel, SUBTYPES, type AdvertiserSubtype, type SubtypeGroupSlug } from "@/lib/advertiser-subtypes";

type Pkg = {
  id: string; name: string; description: string | null;
  advertiser_subtypes: AdvertiserSubtype[] | null;
  min_units: number; max_units: number;
  duration_options: number[]; platform_support: string[];
};
type Milestone = { id: string; name: string; slug: string; default_order: number; requires_duration: boolean };
type PkgMilestone = {
  milestone_id: string; step_order: number;
  pricing_type: "flat" | "commission_pct";
  price_usd: number | null;
  commission_pct: number | null;
};
type WebsiteRow = { id: string; domain: string; is_verified: boolean };
type WalletInfo = { id?: string; balance: number; is_activated: boolean };

const PENDING_KEY = "karbali_pending_package_purchase";

const functionErrorMessage = async (error: unknown, fallback: string) => {
  const context = (error as { context?: { text?: () => Promise<string> } } | null)?.context;
  if (context?.text) {
    try {
      const body = await context.text();
      const parsed = JSON.parse(body);
      return parsed?.error || parsed?.message || body || fallback;
    } catch {
      return (error as Error)?.message || fallback;
    }
  }
  return (error as Error)?.message || fallback;
};

export default function Packages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [pkgMs, setPkgMs] = useState<Record<string, PkgMilestone[]>>({});
  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySubtype, setMySubtype] = useState<AdvertiserSubtype | null>(null);

  const [selected, setSelected] = useState<Pkg | null>(null);
  const [platform, setPlatform] = useState<string>("mobile");
  const [duration, setDuration] = useState<number>(30);
  const [units, setUnits] = useState<number>(500);
  const [unitsText, setUnitsText] = useState<string>("500");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>([""]);
  const [payMethod, setPayMethod] = useState<"wallet" | "paystack">("wallet");
  const [buying, setBuying] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Get advertiser's approved subtype (strict subcategory filter)
    const { data: ac } = await supabase
      .from("advertiser_categories")
      .select("advertiser_subtype, advertiser_type, category_id")
      .eq("advertiser_id", user.id)
      .maybeSingle();
    const sub = ((ac as any)?.advertiser_subtype || null) as AdvertiserSubtype | null;
    const type = ((ac as any)?.advertiser_type || null) as string | null;
    setMySubtype(sub);

    const [{ data: w }, { data: ms }, { data: sites }] = await Promise.all([
      supabase.from("wallets").select("id, balance, is_activated").eq("advertiser_id", user.id).maybeSingle(),
      supabase.from("milestones" as any).select("id,name,slug,default_order,requires_duration").eq("is_active", true).order("default_order"),
      supabase.from("advertiser_websites").select("id, domain, is_verified").eq("advertiser_id", user.id),
    ]);

    // Filter packages by advertiser's subcategory. If subtype is missing but
    // advertiser_type is set, fall back to any subtype in that group so packages
    // still appear for older accounts whose subcategory was never captured.
    let pkgs: any[] = [];
    let query = supabase
      .from("ad_packages" as any)
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at");

    if (sub) {
      const { data: pAll } = await query.contains("advertiser_subtypes", [sub]);
      pkgs = (pAll as any) || [];
    } else if (type) {
      const groupSubtypes = SUBTYPES
        .filter((s) => s.group === (type as SubtypeGroupSlug))
        .map((s) => s.id);
      if (groupSubtypes.length) {
        const { data: pAll } = await query.overlaps("advertiser_subtypes", groupSubtypes);
        pkgs = (pAll as any) || [];
      }
    }
    setPackages(pkgs);
    setWallet((w as any) || null);
    setMilestones((ms as any) || []);
    setWebsites(((sites as any) || []).filter((s: WebsiteRow) => s.is_verified));

    if (pkgs.length) {
      const ids = pkgs.map((p) => p.id);
      const { data: pm } = await supabase.from("package_milestones" as any).select("*").in("package_id", ids);
      const byPkg: Record<string, PkgMilestone[]> = {};
      for (const r of (pm as any) || []) {
        (byPkg[r.package_id] ||= []).push({
          milestone_id: r.milestone_id, step_order: r.step_order,
          pricing_type: (r.pricing_type || "flat") as "flat" | "commission_pct",
          price_usd: r.price_usd != null ? Number(r.price_usd) : null,
          commission_pct: r.commission_pct != null ? Number(r.commission_pct) : null,
        });
      }
      for (const k of Object.keys(byPkg)) byPkg[k].sort((a, b) => a.step_order - b.step_order);
      setPkgMs(byPkg);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const appInstallId = useMemo(
    () => milestones.find((m) => m.slug === "app_install")?.id || null,
    [milestones],
  );

  const openBuy = (p: Pkg) => {
    setSelected(p);
    const platforms = p.platform_support || ["mobile"];
    const initPlat = platforms[0] || "mobile";
    setPlatform(initPlat);
    setDuration((p.duration_options && p.duration_options[0]) || 30);
    setUnits(p.min_units);
    setUnitsText(String(p.min_units));
    const ms = pkgMs[p.id] || [];
    const requiredAppInstall = initPlat === "mobile" && appInstallId && ms.some((r) => r.milestone_id === appInstallId);
    setSelectedIds(requiredAppInstall ? [appInstallId] : []);
    setLinks(initPlat === "web" ? [websites[0]?.domain || ""] : [""]);
    setPayMethod("wallet");
  };

  useEffect(() => {
    if (!selected) return;
    setLinks(platform === "web" ? [websites[0]?.domain || ""] : [""]);
    if (platform === "mobile" && appInstallId && (pkgMs[selected.id] || []).some((r) => r.milestone_id === appInstallId)) {
      setSelectedIds((ids) => ids.includes(appInstallId) ? ids : [appInstallId, ...ids]);
    }
    // eslint-disable-next-line
  }, [platform, selected?.id, appInstallId]);

  // Resume purchase after Paystack top-up
  useEffect(() => {
    if (searchParams.get("funded") === "package" && user) {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      sessionStorage.removeItem(PENDING_KEY);
      (async () => {
        await new Promise((r) => setTimeout(r, 1500));
        const { data, error } = await supabase.rpc("purchase_package_v2" as any, {
          _package_id: p.package_id, _units: p.units, _duration_days: p.duration,
          _selected_milestone_ids: p.selected_ids, _platform: p.platform, _links: p.links,
        });
        if (error) toast.error(`Payment received but purchase failed: ${error.message}`);
        else {
          toast.success("Package purchased! Approval takes 3–7 business days.");
          const orderId = (data as { order_id?: string })?.order_id;
          if (orderId) supabase.functions.invoke("notify", { body: { event: "package_order_submitted", payload: { order_id: orderId } } }).catch(() => {});
        }
        load();
      })();
    }
    // eslint-disable-next-line
  }, [searchParams, user?.id]);

  const packageMs = selected ? (pkgMs[selected.id] || []) : [];
  const selectedMs = packageMs.filter((r) => selectedIds.includes(r.milestone_id));

  // Any selected milestone needs duration?
  const needsDuration = useMemo(() => {
    return selectedMs.some((r) => {
      const m = milestones.find((x) => x.id === r.milestone_id);
      return m?.requires_duration === true;
    });
  }, [selectedMs, milestones]);

  const COMMISSION_RESERVE_PER_USER = 1; // $1/user escrow lock when only commission milestones are chosen

  const commissionRows = selectedMs.filter((r) => r.pricing_type === "commission_pct");
  const hasFlatSelected = selectedMs.some((r) => r.pricing_type === "flat");
  const commissionOnly = !hasFlatSelected && commissionRows.length > 0;

  const flatTotal = useMemo(() => {
    if (commissionOnly) {
      return Number((units * COMMISSION_RESERVE_PER_USER).toFixed(2));
    }
    // Per-milestone: duration-based milestones bill per user per day, flat one-time milestones bill per user.
    const total = selectedMs
      .filter((r) => r.pricing_type === "flat")
      .reduce((s, r) => {
        const m = milestones.find((x) => x.id === r.milestone_id);
        const perUser = r.price_usd || 0;
        const days = m?.requires_duration ? duration : 1;
        return s + perUser * units * days;
      }, 0);
    return Number(total.toFixed(2));
  }, [selectedMs, units, duration, commissionOnly, milestones]);


  const submit = async () => {
    if (!selected || !user) return;
    if (units < selected.min_units || units > selected.max_units) {
      return toast.error(`Users must be between ${selected.min_units} and ${selected.max_units}`);
    }
    if (selectedIds.length === 0) return toast.error("Pick at least one milestone");
    if (!hasFlatSelected && commissionRows.length === 0) return toast.error("Pick at least one milestone");
    if (platform === "mobile" && appInstallId && packageMs.find((r) => r.milestone_id === appInstallId) && !selectedIds.includes(appInstallId)) {
      return toast.error("App Install is required for mobile-app orders");
    }
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
    if (flatTotal <= 0) return toast.error("Total must be greater than zero");

    setBuying(true);
    const args = {
      _package_id: selected.id, _units: units,
      _duration_days: needsDuration ? duration : null,
      _selected_milestone_ids: selectedIds, _platform: platform, _links: cleanLinks,
    };

    if (payMethod === "wallet") {
      if (!wallet?.is_activated) { setBuying(false); return toast.error("Activate your wallet first"); }
      if ((wallet?.balance || 0) < flatTotal) { setBuying(false); return toast.error("Insufficient wallet balance"); }
      const { data, error } = await supabase.rpc("purchase_package_v2" as any, args);
      setBuying(false);
      if (error) return toast.error(error.message);
      toast.success("Package purchased! Approval takes 3–7 business days.");
      const orderId = (data as { order_id?: string })?.order_id;
      if (orderId) supabase.functions.invoke("notify", { body: { event: "package_order_submitted", payload: { order_id: orderId } } }).catch(() => {});
      setSelected(null); load();
      return;
    }

    // Ensure wallet exists before initializing a Paystack top-up
    if (!wallet?.id) {
      const { data: created, error: cErr } = await supabase.functions.invoke("paystack-wallet", { body: { action: "create_wallet" } });
      if (cErr || (created as any)?.error) {
        setBuying(false);
        return toast.error((created as any)?.error || await functionErrorMessage(cErr, "Could not prepare wallet"));
      }
    }

    sessionStorage.setItem(PENDING_KEY, JSON.stringify({
      package_id: selected.id, units, duration: needsDuration ? duration : null,
      selected_ids: selectedIds, platform, links: cleanLinks,
    }));
    const { data, error } = await supabase.functions.invoke("paystack-wallet", {
      body: { action: "initialize_funding", amount: flatTotal, callback_origin: window.location.origin },
    });
    setBuying(false);
    if (error || (data as any)?.error) {
      sessionStorage.removeItem(PENDING_KEY);
      return toast.error((data as any)?.error || await functionErrorMessage(error, "Payment failed"));
    }
    const url = (data as any)?.authorization_url;
    if (!url) { sessionStorage.removeItem(PENDING_KEY); return toast.error("No payment URL"); }
    sessionStorage.setItem("karbali_return_to", `/packages?funded=package`);
    window.location.href = url;
  };

  const unitsLabel = needsDuration ? "Daily users" : "Users (total)";

  return (
    <DashboardLayout>
      <MotionWrapper>
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">Ad Packages</h1>
              {mySubtype && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  {subtypeLabel(mySubtype)}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Templates scoped strictly to your subcategory. Pick exactly the milestones you want.</p>
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
            {mySubtype ? (
              <>No packages available for <strong>{subtypeLabel(mySubtype)}</strong> yet.</>
            ) : (
              <>
                <p>No packages match your account yet.</p>
                <Link to="/category-select" className="mt-3 inline-block text-primary underline">Set your subcategory</Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {packages.map((p) => {
              const ms = pkgMs[p.id] || [];
              const flatRows = ms.filter((r) => r.pricing_type === "flat");
              const cheapest = flatRows.reduce<number | null>((min, r) => {
                const v = r.price_usd || 0;
                return min === null || v < min ? v : min;
              }, null);
              const fullPrice = flatRows.reduce((s, r) => s + (r.price_usd || 0), 0);
              const hasCommission = ms.some((r) => r.pricing_type === "commission_pct");
              const anyDurational = ms.some((r) => {
                const mm = milestones.find((x) => x.id === r.milestone_id);
                return mm?.requires_duration;
              });
              return (
                <div key={p.id} className="rounded-xl border bg-card p-5 flex flex-col">
                  <h3 className="font-semibold">{p.name}</h3>
                  {p.description && <p className="mt-1.5 text-sm text-muted-foreground line-clamp-3">{p.description}</p>}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-muted-foreground">Starts from</p>
                      <p className="font-medium text-sm">${cheapest != null ? cheapest.toFixed(2) : "—"}<span className="text-muted-foreground">/user</span></p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-muted-foreground">Full funnel</p>
                      <p className="font-medium text-sm">${fullPrice.toFixed(2)}<span className="text-muted-foreground">/user</span></p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2 col-span-2">
                      <p className="text-muted-foreground">{anyDurational ? "Daily users" : "Users"}</p>
                      <p className="font-medium text-sm">{p.min_units.toLocaleString()} to {p.max_units.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(p.platform_support || []).map((pl) => <Badge key={pl} variant="outline" className="capitalize text-[10px]">{pl}</Badge>)}
                    {anyDurational && (p.duration_options || []).map((d) => <Badge key={d} variant="secondary" className="text-[10px]">{d}d</Badge>)}
                    {hasCommission && <Badge variant="outline" className="text-[10px]">+ sale commission</Badge>}
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
                  <div>
                    <Label>Platform</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {(selected.platform_support || []).map((pl) => (
                        <button key={pl} type="button"
                          onClick={() => setPlatform(pl as any)}
                          className={`rounded-lg border p-3 text-left text-sm transition ${platform === pl ? "border-primary bg-primary/5" : "hover:bg-accent"}`}>
                          {pl === "mobile" ? <Smartphone className="h-4 w-4 mb-1" /> : <Globe className="h-4 w-4 mb-1" />}
                          <p className="font-medium capitalize">{pl} app</p>
                          <p className="text-xs text-muted-foreground">{pl === "web" ? "1 verified website" : "Up to 2 app links, install required"}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Milestones */}
                  <div>
                    <Label>Select milestones</Label>
                    <div className="mt-1 space-y-1.5">
                      {packageMs.map((r) => {
                        const m = milestones.find((x) => x.id === r.milestone_id);
                        const checked = selectedIds.includes(r.milestone_id);
                        const locked = platform === "mobile" && appInstallId === r.milestone_id;
                        return (
                          <label key={r.milestone_id}
                            className={`w-full flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition ${checked ? "border-primary/40 bg-primary/5" : "hover:bg-accent"}`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <Checkbox
                                checked={checked}
                                disabled={locked}
                                onCheckedChange={(v) => {
                                  const isChecked = v === true;
                                  setSelectedIds((ids) => isChecked
                                    ? Array.from(new Set([...ids, r.milestone_id]))
                                    : ids.filter((id) => id !== r.milestone_id));
                                }}
                              />
                              <span className="font-medium truncate">{m?.name || "?"}</span>
                              {m?.requires_duration && <Badge variant="outline" className="text-[9px]">daily</Badge>}
                              {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {r.pricing_type === "commission_pct"
                                ? `${r.commission_pct}% per sale`
                                : `+$${(r.price_usd || 0).toFixed(2)}/${m?.requires_duration ? "user/day" : "user"}`}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      One-off milestones (install, signup, KYC, deposit) deliver a total number of users. Engagement and Transaction deliver users per day over a duration.
                    </p>
                  </div>

                  {/* Duration (only if needed) */}
                  {needsDuration && (
                    <div>
                      <Label>Delivery duration</Label>
                      <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(selected.duration_options || []).map((d) => (
                            <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-xs text-muted-foreground">{units.toLocaleString()} users daily × {duration} days.</p>
                    </div>
                  )}

                  {/* Units */}
                  <div>
                    <Label>{unitsLabel}</Label>
                    <Input type="number" min={selected.min_units} max={selected.max_units} value={units}
                      onChange={(e) => setUnits(Math.max(selected.min_units, Math.min(selected.max_units, Number(e.target.value) || 0)))} />
                    <p className="mt-1 text-xs text-muted-foreground">Min {selected.min_units.toLocaleString()} · Max {selected.max_units.toLocaleString()}</p>
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
                            <Input value={l} placeholder="https://play.google.com/..."
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
                      <span className="text-sm text-muted-foreground">Upfront total</span>
                      <span className="text-lg font-semibold">${flatTotal.toFixed(2)}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {commissionOnly
                        ? `${units.toLocaleString()} users × $${COMMISSION_RESERVE_PER_USER}/user reserve (locked in escrow to fund per-sale commissions).`
                        : needsDuration
                        ? `${units.toLocaleString()} users × ${duration} days × selected flat milestones.`
                        : `${units.toLocaleString()} users × selected flat milestones.`}
                    </p>
                    {commissionRows.length > 0 && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        + {commissionRows.map((c) => `${c.commission_pct}% per sale`).join(", ")} — deducted from your wallet as each sale is confirmed.
                      </p>
                    )}
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
                  <Button onClick={submit} disabled={buying || flatTotal <= 0 || (platform === "web" && websites.length === 0)}>
                    {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay $${flatTotal.toFixed(2)}`}
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
