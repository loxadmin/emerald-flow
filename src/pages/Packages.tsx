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
import { Package as PackageIcon, Loader2, ShoppingCart, Wallet, CreditCard, ClipboardList, Smartphone, Globe, Lock, Youtube, Music, Instagram, Video, Sparkles, LayoutGrid, Check } from "lucide-react";

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

    // Filter packages by advertiser's subcategory
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

  const COMMISSION_RESERVE_PER_USER = 1;

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
                <div key={p.id} className="group relative rounded-2xl border border-border bg-card/30 backdrop-blur-md p-6 flex flex-col hover:bg-card/50 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 premium-shadow">
                  {/* Decorative corner glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 pointer-events-none" />

                  {/* Title & badge header */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg text-foreground tracking-tight group-hover:text-primary transition-colors">{p.name}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {(p.platform_support || []).map((pl) => (
                          <span key={pl} className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-accent/50 text-muted-foreground border border-border/40">
                            {pl}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 bg-primary/10 text-primary border border-primary/20 rounded-xl p-2.5 shadow-sm">
                      <PackageIcon className="h-5 w-5" />
                    </div>
                  </div>

                  {p.description && (
                    <p className="mt-3.5 text-xs text-muted-foreground leading-relaxed line-clamp-3 min-h-[3.25rem]">
                      {p.description}
                    </p>
                  )}

                  {/* Pricing Range */}
                  <div className="mt-6 border-t border-border/40 pt-5 space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pricing Structure</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-foreground tracking-tight tabular-nums">
                        ${cheapest != null ? cheapest.toFixed(2) : "—"}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold">to</span>
                      <span className="text-lg font-bold text-foreground tabular-nums">
                        ${fullPrice.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium ml-0.5">/ user</span>
                    </div>
                  </div>

                  {/* Benefit list / included milestones */}
                  <div className="mt-5 space-y-2.5 flex-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Included Funnel Milestones</p>
                    <ul className="space-y-2">
                      {ms.map((rm) => {
                        const m = milestones.find((x) => x.id === rm.milestone_id);
                        return (
                          <li key={rm.milestone_id} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-semibold text-foreground/90">{m?.name || "Milestone"}</span>
                            {m?.requires_duration && (
                              <span className="ml-1 text-[9px] font-bold uppercase tracking-wider text-primary px-1 py-0.2 rounded bg-primary/10 border border-primary/15">
                                daily
                              </span>
                            )}
                            <span className="ml-auto text-[11px] font-mono font-bold text-muted-foreground/80">
                              {rm.pricing_type === "commission_pct" ? `${rm.commission_pct}%` : `$${(rm.price_usd || 0).toFixed(2)}`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Volume Summary */}
                  <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Target volume range</span>
                    <span className="font-bold text-foreground font-mono">
                      {p.min_units.toLocaleString()} – {p.max_units.toLocaleString()}
                    </span>
                  </div>

                  <Button
                    className="mt-6 w-full font-bold shadow-md shadow-primary/5 hover:shadow-primary/15 hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 py-5 rounded-xl"
                    onClick={() => openBuy(p)}
                    disabled={ms.length === 0}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" /> {ms.length === 0 ? "Under Configuration" : "Deploy Campaign"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Premium dialog modal revamp */}
        <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
          <DialogContent className="max-w-xl max-h-[95vh] overflow-y-auto border-border/80 bg-card/95 backdrop-blur-2xl rounded-2xl p-6 md:p-8 premium-shadow">
            {selected && (
              <>
                <DialogHeader className="border-b border-border/40 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2.5 rounded-xl text-primary border border-primary/20 shadow-inner">
                      <PackageIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                        Configure Campaign
                      </DialogTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{selected.name}</p>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Platform selection buttons */}
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground">Select Campaign Platform</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {(selected.platform_support || []).map((pl) => {
                        const meta = PLATFORM_META[pl] || { label: pl, sub: "1 Link", Icon: Globe, placeholder: "" };
                        const Icon = meta.Icon;
                        return (
                          <button key={pl} type="button"
                            onClick={() => setPlatform(pl)}
                            className={`group rounded-xl border p-4 text-left transition-all duration-200 flex flex-col justify-between min-h-[95px] relative ${platform === pl ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-border/60 hover:bg-accent/20"}`}>
                            {platform === pl && (
                              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
                            )}
                            <Icon className={`h-5 w-5 ${platform === pl ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} transition-colors`} />
                            <div className="mt-2">
                              <p className="font-bold text-xs text-foreground">{meta.label}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{meta.sub}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Milestones Checkboxes */}
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground">Funnel Milestones</Label>
                    <div className="space-y-2">
                      {packageMs.map((r) => {
                        const m = milestones.find((x) => x.id === r.milestone_id);
                        const checked = selectedIds.includes(r.milestone_id);
                        const locked = platform === "mobile" && appInstallId === r.milestone_id;
                        return (
                          <div key={r.milestone_id}
                            onClick={() => {
                              if (locked) return;
                              const isChecked = !checked;
                              setSelectedIds((ids) => isChecked
                                ? Array.from(new Set([...ids, r.milestone_id]))
                                : ids.filter((id) => id !== r.milestone_id));
                            }}
                            className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-sm transition-all duration-200 cursor-pointer select-none ${checked ? "border-primary/45 bg-primary/5" : "border-border/60 hover:bg-accent/30"}`}>
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
                                <span className="font-bold text-foreground text-xs leading-none">{m?.name || "?"}</span>
                                {m?.requires_duration && (
                                  <span className="text-[9px] text-primary font-bold uppercase tracking-wider mt-0.5 block">Durational delivery required</span>
                                )}
                              </div>
                              {locked && <Lock className="h-3 w-3 text-muted-foreground/60" />}
                            </div>
                            <span className="shrink-0 text-xs font-bold text-foreground/90 font-mono">
                              {r.pricing_type === "commission_pct"
                                ? `${r.commission_pct}% commission`
                                : `+$${(r.price_usd || 0).toFixed(2)} / ${m?.requires_duration ? "user/day" : "user"}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dual Grid for Volume Input & Duration Selector if durational */}
                  <div className={`grid gap-4 ${needsDuration ? "grid-cols-2" : "grid-cols-1"}`}>
                    {/* Units Input */}
                    <div className="space-y-2">
                      <Label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground">{unitsLabel}</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        className="rounded-xl border-border bg-background/50 h-11 px-4 text-sm font-semibold text-foreground focus-visible:ring-primary focus-visible:ring-offset-0"
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
                      <p className="text-[10px] text-muted-foreground">Range: {selected.min_units.toLocaleString()} to {selected.max_units.toLocaleString()} {unitsNoun}</p>
                    </div>

                    {/* Duration selector */}
                    {needsDuration && (
                      <div className="space-y-2">
                        <Label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground">Delivery Duration</Label>
                        <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                          <SelectTrigger className="rounded-xl border-border bg-background/50 h-11 text-sm font-semibold focus:ring-primary focus:ring-offset-0"><SelectValue /></SelectTrigger>
                          <SelectContent className="border-border">
                            {(selected.duration_options || []).map((d) => (
                              <SelectItem key={d} value={String(d)} className="font-semibold text-xs">{d} days</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">Total users: {(units * duration).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Links Field */}
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground">
                      {platform === "web" ? "Verified Destination Website"
                        : platform === "mobile" ? "App Store Links"
                        : `${PLATFORM_META[platform]?.label || platform} Destination Link`}
                    </Label>
                    <div>
                      {platform === "web" ? (
                        websites.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border p-4.5 text-xs text-center bg-muted/20">
                            <p className="text-muted-foreground font-semibold">No verified websites connected.</p>
                            <Link to="/websites"><Button size="sm" variant="link" className="text-primary hover:underline px-0 mt-1 font-bold">Verify domain first →</Button></Link>
                          </div>
                        ) : (
                          <Select value={links[0]} onValueChange={(v) => setLinks([v])}>
                            <SelectTrigger className="rounded-xl border-border bg-background/50 h-11 text-sm font-semibold"><SelectValue placeholder="Pick a verified website" /></SelectTrigger>
                            <SelectContent className="border-border">{websites.map((s) => <SelectItem key={s.id} value={s.domain} className="text-xs font-medium">{s.domain}</SelectItem>)}</SelectContent>
                          </Select>
                        )
                      ) : platform === "mobile" ? (
                        <div className="space-y-2">
                          {links.map((l, i) => (
                            <div key={i} className="flex gap-2">
                              <Input value={l} placeholder={PLATFORM_META[platform]?.placeholder || "https://..."} className="rounded-xl border-border bg-background/50 h-11 text-xs"
                                onChange={(e) => setLinks(links.map((x, j) => j === i ? e.target.value : x))} />
                              {links.length > 1 && (
                                <Button variant="outline" size="icon" className="rounded-xl shrink-0 h-11 w-11" onClick={() => setLinks(links.filter((_, j) => j !== i))}>✕</Button>
                              )}
                            </div>
                          ))}
                          {links.length < 2 && (
                            <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5 rounded-lg mt-0.5 font-bold text-xs" onClick={() => setLinks([...links, ""])}>+ Add Play Store / App Store URL</Button>
                          )}
                        </div>
                      ) : (
                        <Input
                          value={links[0] || ""}
                          className="rounded-xl border-border bg-background/50 h-11 text-xs"
                          placeholder={PLATFORM_META[platform]?.placeholder || "https://..."}
                          onChange={(e) => setLinks([e.target.value])}
                        />
                      )}
                    </div>
                  </div>

                  {/* Payment Methods buttons */}
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground">Choose Payment Gateway</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setPayMethod("wallet")}
                        className={`rounded-xl border p-4 text-left transition-all duration-200 flex flex-col justify-between min-h-[95px] relative ${payMethod === "wallet" ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-border/60 hover:bg-accent/20"}`}>
                        {payMethod === "wallet" && (
                          <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                        <Wallet className={`h-5 w-5 ${payMethod === "wallet" ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="mt-2">
                          <p className="font-bold text-xs text-foreground">Corporate Wallet</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Balance: ${(wallet?.balance || 0).toFixed(2)}</p>
                        </div>
                      </button>
                      <button type="button" onClick={() => setPayMethod("paystack")}
                        className={`rounded-xl border p-4 text-left transition-all duration-200 flex flex-col justify-between min-h-[95px] relative ${payMethod === "paystack" ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-border/60 hover:bg-accent/20"}`}>
                        {payMethod === "paystack" && (
                          <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                        <CreditCard className={`h-5 w-5 ${payMethod === "paystack" ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="mt-2">
                          <p className="font-bold text-xs text-foreground">Paystack Engine</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Card, Bank Transfer, USSD</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Summary calculation card */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Upfront billing amount</span>
                      <span className="text-2xl font-extrabold text-foreground tabular-nums">${flatTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {commissionOnly
                        ? `${units.toLocaleString()} users × $${COMMISSION_RESERVE_PER_USER}/user reserve locked in escrow to fund per-sale commissions.`
                        : needsDuration
                        ? `${units.toLocaleString()} users × ${duration} days × selected flat milestones.`
                        : `${units.toLocaleString()} users × selected flat milestones.`}
                    </p>
                    {commissionRows.length > 0 && (
                      <p className="text-[11px] font-bold text-amber-500">
                        + {commissionRows.map((c) => `${c.commission_pct}% per sale`).join(", ")} deducted upon delivery verification.
                      </p>
                    )}
                  </div>
                </div>

                <DialogFooter className="mt-8 border-t border-border/40 pt-4 gap-2 flex items-center justify-end">
                  <Button variant="outline" className="rounded-xl font-bold border-border/80 text-xs px-5 h-11" onClick={() => setSelected(null)}>Cancel</Button>
                  <Button onClick={submit} className="rounded-xl font-extrabold shadow-md shadow-primary/20 scale-100 hover:scale-[1.01] transition-transform text-xs px-6 h-11" disabled={buying || flatTotal <= 0 || (platform === "web" && websites.length === 0)}>
                    {buying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {buying ? "Processing..." : `Confirm Payment: $${flatTotal.toFixed(2)}`}
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
