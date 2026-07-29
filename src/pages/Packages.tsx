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
import { Package as PackageIcon, Loader2, ShoppingCart, Wallet, CreditCard, ClipboardList, Smartphone, Globe, Lock, Youtube, Music, Instagram, Video, Sparkles, LayoutGrid } from "lucide-react";

const PLATFORM_META: Record<string, { label: string; sub: string; Icon: any; placeholder: string }> = {
  mobile:    { label: "Mobile App", sub: "Up to 2 app store/play store links", Icon: Smartphone, placeholder: "https://play.google.com/..." },
  web:       { label: "Verified Website",    sub: "Must be owned and verified",                  Icon: Globe,      placeholder: "https://yourdomain.com" },
  youtube:   { label: "YouTube Channel",    sub: "1 channel or custom video link",             Icon: Youtube,    placeholder: "https://youtube.com/@yourchannel" },
  spotify:   { label: "Spotify Platform",    sub: "1 artist profile or album link",              Icon: Music,      placeholder: "https://open.spotify.com/artist/..." },
  instagram: { label: "Instagram",  sub: "1 profile link or video post",                      Icon: Instagram,  placeholder: "https://instagram.com/yourhandle" },
  tiktok:    { label: "TikTok Video",     sub: "1 profile link or video post",                      Icon: Video,      placeholder: "https://tiktok.com/@yourhandle" },
};

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
    } else if (platform === "mobile") {
      if (cleanLinks.length < 1 || cleanLinks.length > 2) return toast.error("Add 1 or 2 app links");
      for (const l of cleanLinks) { try { new URL(l); } catch { return toast.error(`Invalid URL: ${l}`); } }
    } else {
      if (cleanLinks.length !== 1) return toast.error("Add exactly 1 link");
      try { new URL(cleanLinks[0]); } catch { return toast.error(`Invalid URL: ${cleanLinks[0]}`); }
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

  const STREAM_SLUGS = new Set(["music_streams"]);
  const VIEW_SLUGS = new Set(["youtube_video_views", "video_view"]);
  const selectedSlugs = selectedMs
    .map((r) => milestones.find((m) => m.id === r.milestone_id)?.slug)
    .filter(Boolean) as string[];
  const allStreams = selectedSlugs.length > 0 && selectedSlugs.every((s) => STREAM_SLUGS.has(s));
  const allViews = selectedSlugs.length > 0 && selectedSlugs.every((s) => VIEW_SLUGS.has(s));
  const unitsNoun = allStreams ? "streams" : allViews ? "views" : "users";
  const unitsLabel = allStreams
    ? "Total streams"
    : allViews
    ? "Total views"
    : needsDuration ? "Daily users" : "Users (total)";

  return (
    <DashboardLayout>
      <MotionWrapper>
        {/* Dynamic Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Ad Packages</h1>
              {mySubtype && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500 border border-emerald-500/20">
                  {subtypeLabel(mySubtype)}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1.5">Premium tailored, fully-integrated campaigns ready to go live in clicks.</p>
          </div>
          <Link to="/packages/orders">
            <Button variant="outline" size="sm" className="gap-2 font-semibold shadow-sm hover:bg-accent hover:-translate-y-0.5 transition-all">
              <ClipboardList className="h-4 w-4 text-primary" /> My Orders
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : packages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground bg-card/20 backdrop-blur-md">
            <PackageIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            {mySubtype ? (
              <p className="text-base font-semibold">No packages available for <strong>{subtypeLabel(mySubtype)}</strong> yet.</p>
            ) : (
              <>
                <p className="text-base font-semibold">No packages match your advertiser profile yet.</p>
                <Link to="/category-select" className="mt-3 inline-block text-primary underline font-medium">Set your subcategory</Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                <div key={p.id} className="group relative rounded-2xl border border-border bg-card/40 backdrop-blur-md p-6 flex flex-col hover:bg-card hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 premium-shadow">
                  {/* Badge top indicator */}
                  <div className="absolute top-4 right-4 text-primary bg-primary/10 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>

                  <h3 className="font-bold text-lg text-foreground tracking-tight">{p.name}</h3>
                  {p.description && <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3 min-h-[3rem]">{p.description}</p>}

                  {/* Sleek pricing indicator tables */}
                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-accent/25 p-3 border border-border/40">
                      <p className="text-muted-foreground font-medium">Starts from</p>
                      <p className="font-bold text-base mt-0.5 text-foreground">
                        ${cheapest != null ? cheapest.toFixed(2) : "—"}
                        <span className="text-xs text-muted-foreground font-normal">/user</span>
                      </p>
                    </div>
                    <div className="rounded-xl bg-accent/25 p-3 border border-border/40">
                      <p className="text-muted-foreground font-medium">Full funnel</p>
                      <p className="font-bold text-base mt-0.5 text-foreground">
                        ${fullPrice.toFixed(2)}
                        <span className="text-xs text-muted-foreground font-normal">/user</span>
                      </p>
                    </div>
                    <div className="rounded-xl bg-accent/25 p-3 border border-border/40 col-span-2">
                      {(() => {
                        const slugs = ms.map((r) => milestones.find((x) => x.id === r.milestone_id)?.slug).filter(Boolean) as string[];
                        const allS = slugs.length > 0 && slugs.every((s) => s === "music_streams");
                        const allV = slugs.length > 0 && slugs.every((s) => s === "youtube_video_views" || s === "video_view");
                        const label = allS ? "Streams range" : allV ? "Views range" : anyDurational ? "Daily target volume" : "User volume range";
                        return (
                          <>
                            <p className="text-muted-foreground font-medium">{label}</p>
                            <p className="font-bold text-sm mt-0.5 text-foreground">
                              {p.min_units.toLocaleString()} – {p.max_units.toLocaleString()}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Badges footer */}
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {(p.platform_support || []).map((pl) => (
                      <Badge key={pl} variant="outline" className="capitalize text-[10px] font-semibold bg-background/50 border-border/80">
                        {pl}
                      </Badge>
                    ))}
                    {anyDurational && (p.duration_options || []).map((d) => (
                      <Badge key={d} variant="secondary" className="text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                        {d} days duration
                      </Badge>
                    ))}
                    {hasCommission && (
                      <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/20 bg-amber-500/5 text-amber-500">
                        + sale commission
                      </Badge>
                    )}
                  </div>

                  <Button className="mt-6 w-full font-semibold shadow-md group-hover:bg-primary/95 group-hover:scale-[1.01] transition-all" onClick={() => openBuy(p)} disabled={ms.length === 0}>
                    <ShoppingCart className="mr-2 h-4 w-4" /> {ms.length === 0 ? "Under Configuration" : "Deploy Package"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Premium dialog modal revamp */}
        <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto border-border/80 bg-card/95 backdrop-blur-2xl rounded-2xl premium-shadow">
            {selected && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2.5">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary border border-primary/20">
                      <PackageIcon className="h-5 w-5" />
                    </div>
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                      Deploy: {selected.name}
                    </DialogTitle>
                  </div>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                  {/* Platform selection buttons */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Select Campaign Platform</Label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      {(selected.platform_support || []).map((pl) => {
                        const meta = PLATFORM_META[pl] || { label: pl, sub: "1 Link", Icon: Globe, placeholder: "" };
                        const Icon = meta.Icon;
                        return (
                          <button key={pl} type="button"
                            onClick={() => setPlatform(pl)}
                            className={`rounded-xl border p-3.5 text-left transition-all duration-200 ${platform === pl ? "border-primary bg-primary/10 shadow-sm shadow-primary/10" : "border-border/60 hover:bg-accent/40"}`}>
                            <Icon className={`h-5 w-5 mb-2 ${platform === pl ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
                            <p className="font-bold text-sm text-foreground">{meta.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{meta.sub}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Milestones Checkboxes */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Select funnel Milestones</Label>
                    <div className="mt-2 space-y-2">
                      {packageMs.map((r) => {
                        const m = milestones.find((x) => x.id === r.milestone_id);
                        const checked = selectedIds.includes(r.milestone_id);
                        const locked = platform === "mobile" && appInstallId === r.milestone_id;
                        return (
                          <label key={r.milestone_id}
                            className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-all duration-200 cursor-pointer ${checked ? "border-primary/45 bg-primary/5" : "border-border/60 hover:bg-accent/30"}`}>
                            <div className="flex items-center gap-3.5 min-w-0">
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
                              <div className="min-w-0">
                                <span className="font-semibold text-foreground truncate block">{m?.name || "?"}</span>
                                {m?.requires_duration && <span className="text-[10px] text-primary font-medium mt-0.5 block">Durational delivery required</span>}
                              </div>
                              {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />}
                            </div>
                            <span className="shrink-0 text-xs font-bold text-foreground">
                              {r.pricing_type === "commission_pct"
                                ? `${r.commission_pct}% commission`
                                : `+$${(r.price_usd || 0).toFixed(2)} / ${m?.requires_duration ? "user/day" : "user"}`}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Duration selector */}
                  {needsDuration && (
                    <div>
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Delivery Duration</Label>
                      <div className="mt-2">
                        <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                          <SelectTrigger className="rounded-xl border-border bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent className="border-border">
                            {(selected.duration_options || []).map((d) => (
                              <SelectItem key={d} value={String(d)} className="font-semibold">{d} days</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-1.5 text-xs text-muted-foreground font-medium">{units.toLocaleString()} users daily × {duration} days total coverage.</p>
                      </div>
                    </div>
                  )}

                  {/* Units Input */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{unitsLabel}</Label>
                    <div className="mt-2">
                      <Input
                        type="number"
                        inputMode="numeric"
                        className="rounded-xl border-border bg-background"
                        min={selected.min_units}
                        max={selected.max_units}
                        value={unitsText}
                        onChange={(e) => {
                          setUnitsText(e.target.value);
                          const n = Number(e.target.value);
                          if (!Number.isNaN(n) && e.target.value !== "") setUnits(n);
                        }}
                        onBlur={() => {
                          const n = Number(unitsText);
                          const clamped = Number.isFinite(n)
                            ? Math.max(selected.min_units, Math.min(selected.max_units, Math.floor(n)))
                            : selected.min_units;
                          setUnits(clamped);
                          setUnitsText(String(clamped));
                        }}
                      />
                      <p className="mt-1.5 text-[11px] text-muted-foreground">Limit: {selected.min_units.toLocaleString()} to {selected.max_units.toLocaleString()} {unitsNoun}.</p>
                    </div>
                  </div>

                  {/* Links Field */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                      {platform === "web" ? "Verified Destination Website"
                        : platform === "mobile" ? "App Store Links"
                        : `${PLATFORM_META[platform]?.label || platform} Destination Link`}
                    </Label>
                    <div className="mt-2">
                      {platform === "web" ? (
                        websites.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-center bg-muted/20">
                            <p className="text-muted-foreground font-medium">No verified websites connected.</p>
                            <Link to="/websites"><Button size="sm" variant="link" className="text-primary hover:underline px-0 mt-1 font-semibold">Verify domain first →</Button></Link>
                          </div>
                        ) : (
                          <Select value={links[0]} onValueChange={(v) => setLinks([v])}>
                            <SelectTrigger className="rounded-xl border-border bg-background"><SelectValue placeholder="Pick a verified website" /></SelectTrigger>
                            <SelectContent className="border-border">{websites.map((s) => <SelectItem key={s.id} value={s.domain}>{s.domain}</SelectItem>)}</SelectContent>
                          </Select>
                        )
                      ) : platform === "mobile" ? (
                        <div className="space-y-2">
                          {links.map((l, i) => (
                            <div key={i} className="flex gap-2">
                              <Input value={l} placeholder="https://play.google.com/..." className="rounded-xl border-border bg-background"
                                onChange={(e) => setLinks(links.map((x, j) => j === i ? e.target.value : x))} />
                              {links.length > 1 && (
                                <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => setLinks(links.filter((_, j) => j !== i))}>✕</Button>
                              )}
                            </div>
                          ))}
                          {links.length < 2 && (
                            <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5 rounded-lg mt-1 font-semibold" onClick={() => setLinks([...links, ""])}>+ Add Android/iOS URL</Button>
                          )}
                        </div>
                      ) : (
                        <Input
                          value={links[0] || ""}
                          className="rounded-xl border-border bg-background"
                          placeholder={PLATFORM_META[platform]?.placeholder || "https://..."}
                          onChange={(e) => setLinks([e.target.value])}
                        />
                      )}
                    </div>
                  </div>

                  {/* Summary calculation card */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Upfront billing amount</span>
                      <span className="text-xl font-bold text-foreground">${flatTotal.toFixed(2)}</span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      {commissionOnly
                        ? `${units.toLocaleString()} users × $${COMMISSION_RESERVE_PER_USER}/user reserve locked in escrow to fund per-sale commissions.`
                        : needsDuration
                        ? `${units.toLocaleString()} users × ${duration} days × selected flat milestones.`
                        : `${units.toLocaleString()} users × selected flat milestones.`}
                    </p>
                    {commissionRows.length > 0 && (
                      <p className="mt-2 text-[11px] font-bold text-amber-500">
                        + {commissionRows.map((c) => `${c.commission_pct}% per sale`).join(", ")} deducted upon delivery verification.
                      </p>
                    )}
                  </div>

                  {/* Payment Methods buttons */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Choose Payment Gateway</Label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setPayMethod("wallet")}
                        className={`rounded-xl border p-4 text-left transition-all duration-200 ${payMethod === "wallet" ? "border-primary bg-primary/10 shadow-sm shadow-primary/10" : "border-border/60 hover:bg-accent/40"}`}>
                        <Wallet className={`h-5 w-5 mb-2 ${payMethod === "wallet" ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="font-bold text-sm text-foreground">Corporate Wallet</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Available: ${(wallet?.balance || 0).toFixed(2)}</p>
                      </button>
                      <button type="button" onClick={() => setPayMethod("paystack")}
                        className={`rounded-xl border p-4 text-left transition-all duration-200 ${payMethod === "paystack" ? "border-primary bg-primary/10 shadow-sm shadow-primary/10" : "border-border/60 hover:bg-accent/40"}`}>
                        <CreditCard className={`h-5 w-5 mb-2 ${payMethod === "paystack" ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="font-bold text-sm text-foreground">Paystack Engine</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Instant Card/Bank payment</p>
                      </button>
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-6 border-t border-border pt-4 gap-2">
                  <Button variant="outline" className="rounded-xl font-semibold" onClick={() => setSelected(null)}>Cancel</Button>
                  <Button onClick={submit} className="rounded-xl font-bold shadow-md shadow-primary/20 scale-100 hover:scale-[1.01] transition-transform" disabled={buying || flatTotal <= 0 || (platform === "web" && websites.length === 0)}>
                    {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : `Authorize Payment: $${flatTotal.toFixed(2)}`}
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
