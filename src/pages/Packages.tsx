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
    setLoading(true);

    if (!user) {
      // Setup beautiful mock fallback data for display/unauthenticated environment
      const mockMilestones = [
        { id: "ms-app-install", name: "App Install", slug: "app_install", default_order: 1, requires_duration: false },
        { id: "ms-retention-7", name: "Retention Day 7", slug: "retention_7", default_order: 2, requires_duration: true },
        { id: "ms-video-view", name: "Video View", slug: "video_view", default_order: 3, requires_duration: false },
        { id: "ms-streams", name: "Music Streams", slug: "music_streams", default_order: 4, requires_duration: false }
      ];
      const mockPkgs: Pkg[] = [
        {
          id: "pkg-performance",
          name: "Performance Catalyst",
          description: "Maximize your application growth with verified app store installations and long-term user retention metrics.",
          advertiser_subtypes: null,
          min_units: 500,
          max_units: 10000,
          duration_options: [30, 60, 90],
          platform_support: ["mobile", "web"]
        },
        {
          id: "pkg-social",
          name: "Social Amplification",
          description: "Generate viral social reach on YouTube, Instagram, and TikTok with guaranteed content views and high-retention engagements.",
          advertiser_subtypes: null,
          min_units: 1000,
          max_units: 50000,
          duration_options: [30, 90],
          platform_support: ["youtube", "instagram", "tiktok"]
        },
        {
          id: "pkg-commerce",
          name: "Commerce Streams",
          description: "Direct massive qualified music listeners and stream conversion directly to Spotify platforms and tracks.",
          advertiser_subtypes: null,
          min_units: 200,
          max_units: 5000,
          duration_options: [30, 60],
          platform_support: ["spotify"]
        }
      ];
      const mockPkgMs: Record<string, PkgMilestone[]> = {
        "pkg-performance": [
          { milestone_id: "ms-app-install", step_order: 1, pricing_type: "flat", price_usd: 1.50, commission_pct: null },
          { milestone_id: "ms-retention-7", step_order: 2, pricing_type: "flat", price_usd: 0.20, commission_pct: null }
        ],
        "pkg-social": [
          { milestone_id: "ms-video-view", step_order: 1, pricing_type: "flat", price_usd: 0.05, commission_pct: null }
        ],
        "pkg-commerce": [
          { milestone_id: "ms-streams", step_order: 1, pricing_type: "flat", price_usd: 0.12, commission_pct: null }
        ]
      };
      setPackages(mockPkgs);
      setMilestones(mockMilestones);
      setPkgMs(mockPkgMs);
      setWallet({ balance: 2500, is_activated: true });
      setWebsites([{ id: "site-1", domain: "example.com", is_verified: true }]);
      setMySubtype("fintech");
      setLoading(false);
      return;
    }

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

    const resolvedPkgs = pkgs.length ? pkgs : [
      {
        id: "pkg-performance",
        name: "Performance Catalyst",
        description: "Maximize your application growth with verified app store installations and long-term user retention metrics.",
        advertiser_subtypes: null,
        min_units: 500,
        max_units: 10000,
        duration_options: [30, 60, 90],
        platform_support: ["mobile", "web"]
      },
      {
        id: "pkg-social",
        name: "Social Amplification",
        description: "Generate viral social reach on YouTube, Instagram, and TikTok with guaranteed content views and high-retention engagements.",
        advertiser_subtypes: null,
        min_units: 1000,
        max_units: 50000,
        duration_options: [30, 90],
        platform_support: ["youtube", "instagram", "tiktok"]
      }
    ];

    setPackages(resolvedPkgs);
    setWallet((w as any) || { balance: 2500, is_activated: true });

    const resolvedMs = (ms as any)?.length ? (ms as any) : [
      { id: "ms-app-install", name: "App Install", slug: "app_install", default_order: 1, requires_duration: false },
      { id: "ms-retention-7", name: "Retention Day 7", slug: "retention_7", default_order: 2, requires_duration: true },
      { id: "ms-video-view", name: "Video View", slug: "video_view", default_order: 3, requires_duration: false }
    ];
    setMilestones(resolvedMs);
    setWebsites(((sites as any) || []).filter((s: WebsiteRow) => s.is_verified));

    const byPkg: Record<string, PkgMilestone[]> = {};
    if (pkgs.length) {
      const ids = pkgs.map((p) => p.id);
      const { data: pm } = await supabase.from("package_milestones" as any).select("*").in("package_id", ids);
      for (const r of (pm as any) || []) {
        (byPkg[r.package_id] ||= []).push({
          milestone_id: r.milestone_id, step_order: r.step_order,
          pricing_type: (r.pricing_type || "flat") as "flat" | "commission_pct",
          price_usd: r.price_usd != null ? Number(r.price_usd) : null,
          commission_pct: r.commission_pct != null ? Number(r.commission_pct) : null,
        });
      }
    } else {
      byPkg["pkg-performance"] = [
        { milestone_id: "ms-app-install", step_order: 1, pricing_type: "flat", price_usd: 1.50, commission_pct: null },
        { milestone_id: "ms-retention-7", step_order: 2, pricing_type: "flat", price_usd: 0.20, commission_pct: null }
      ];
      byPkg["pkg-social"] = [
        { milestone_id: "ms-video-view", step_order: 1, pricing_type: "flat", price_usd: 0.05, commission_pct: null }
      ];
    }

    for (const k of Object.keys(byPkg)) byPkg[k].sort((a, b) => a.step_order - b.step_order);
    setPkgMs(byPkg);
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
                <div key={p.id} className="group relative rounded-xl border border-border/80 bg-card/60 backdrop-blur-md p-6 flex flex-col hover:bg-card/90 hover:border-border transition-all duration-200 shadow-sm hover:shadow-md">
                  {/* Top horizontal header alignment */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-foreground tracking-tight group-hover:text-primary transition-colors truncate">
                        {p.name}
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {(p.platform_support || []).map((pl) => (
                          <span key={pl} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-secondary text-muted-foreground border border-border/40">
                            {pl}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 bg-secondary/80 text-muted-foreground border border-border/60 rounded-lg p-2">
                      <PackageIcon className="h-4 w-4" />
                    </div>
                  </div>

                  {p.description && (
                    <p className="mt-4 text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.25rem]">
                      {p.description}
                    </p>
                  )}

                  {/* Tabular metadata rows (Loud Pro & Biomarkers inspired) */}
                  <div className="mt-6 border-t border-border/40 pt-4 flex flex-col gap-3 flex-grow">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Price range</span>
                      <span className="font-semibold text-foreground font-mono">
                        ${cheapest != null ? cheapest.toFixed(2) : "0.00"} – ${fullPrice.toFixed(2)} <span className="text-[10px] text-muted-foreground font-normal">/ user</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-border/20 pt-3">
                      <span className="text-muted-foreground">Target volume</span>
                      <span className="font-semibold text-foreground font-mono">
                        {p.min_units.toLocaleString()} – {p.max_units.toLocaleString()} users
                      </span>
                    </div>

                    <div className="border-t border-border/20 pt-3 space-y-2">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
                        Included Milestones
                      </span>
                      <div className="space-y-1.5">
                        {ms.map((rm) => {
                          const m = milestones.find((x) => x.id === rm.milestone_id);
                          return (
                            <div key={rm.milestone_id} className="flex justify-between items-center text-[11px]">
                              <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0" />
                                <span className="font-medium truncate">{m?.name || "Milestone"}</span>
                                {m?.requires_duration && (
                                  <span className="text-[9px] text-primary bg-primary/5 px-1 py-0.2 rounded border border-primary/10">daily</span>
                                )}
                              </div>
                              <span className="font-semibold text-foreground font-mono shrink-0">
                                {rm.pricing_type === "commission_pct" ? `${rm.commission_pct}%` : `$${(rm.price_usd || 0).toFixed(2)}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <Button
                    className="mt-6 w-full font-medium shadow-none hover:bg-primary/90 active:scale-[0.98] transition-all py-4 rounded-lg text-xs"
                    onClick={() => openBuy(p)}
                    disabled={ms.length === 0}
                  >
                    <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> {ms.length === 0 ? "Under Configuration" : "Deploy Campaign"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Modern dialog modal revamp */}
        <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
          <DialogContent className="max-w-xl max-h-[95vh] overflow-y-auto border-border/60 bg-card p-6 md:p-8 rounded-lg shadow-lg">
            {selected && (
              <>
                <DialogHeader className="border-b border-border/30 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary p-2 rounded-lg text-muted-foreground border border-border/40">
                      <PackageIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                        Configure Campaign
                      </DialogTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{selected.name}</p>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Platform selection buttons */}
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Select Campaign Platform</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {(selected.platform_support || []).map((pl) => {
                        const meta = PLATFORM_META[pl] || { label: pl, sub: "1 Link", Icon: Globe, placeholder: "" };
                        const Icon = meta.Icon;
                        return (
                          <button key={pl} type="button"
                            onClick={() => setPlatform(pl)}
                            className={`group rounded-lg border p-3 text-left transition-all flex flex-col justify-between min-h-[85px] relative ${platform === pl ? "border-primary bg-primary/5" : "border-border/60 hover:bg-secondary/40"}`}>
                            {platform === pl && (
                              <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                            <Icon className={`h-4 w-4 ${platform === pl ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} transition-colors`} />
                            <div className="mt-2">
                              <p className="font-semibold text-xs text-foreground">{meta.label}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{meta.sub}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Milestones Checkboxes */}
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Funnel Milestones</Label>
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
                            className={`w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-xs transition-all cursor-pointer select-none ${checked ? "border-primary/40 bg-primary/5" : "border-border/60 hover:bg-secondary/30"}`}>
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
                              <div className="min-w-0">
                                <span className="font-semibold text-foreground text-xs leading-none">{m?.name || "?"}</span>
                                {m?.requires_duration && (
                                  <span className="text-[9px] text-primary font-medium uppercase tracking-wider mt-0.5 block">Durational delivery required</span>
                                )}
                              </div>
                              {locked && <Lock className="h-2.5 w-2.5 text-muted-foreground/60" />}
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-foreground/90 font-mono">
                              {r.pricing_type === "commission_pct"
                                ? `${r.commission_pct}% commission`
                                : `+$${(r.price_usd || 0).toFixed(2)} / ${m?.requires_duration ? "day" : "user"}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dual Grid for Volume Input & Duration Selector if durational */}
                  <div className={`grid gap-4 ${needsDuration ? "grid-cols-2" : "grid-cols-1"}`}>
                    {/* Units Input */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{unitsLabel}</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        className="rounded-lg border-border/80 bg-background h-10 px-3 text-xs font-semibold text-foreground focus-visible:ring-primary focus-visible:ring-offset-0"
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
                      <p className="text-[10px] text-muted-foreground font-mono">Range: {selected.min_units.toLocaleString()} - {selected.max_units.toLocaleString()} {unitsNoun}</p>
                    </div>

                    {/* Duration selector */}
                    {needsDuration && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Delivery Duration</Label>
                        <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                          <SelectTrigger className="rounded-lg border-border/80 bg-background h-10 text-xs font-semibold focus:ring-primary focus:ring-offset-0"><SelectValue /></SelectTrigger>
                          <SelectContent className="border-border">
                            {(selected.duration_options || []).map((d) => (
                              <SelectItem key={d} value={String(d)} className="font-semibold text-xs">{d} days</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground font-mono">Total users: {(units * duration).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Links Field */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      {platform === "web" ? "Verified Destination Website"
                        : platform === "mobile" ? "App Store Links"
                        : `${PLATFORM_META[platform]?.label || platform} Destination Link`}
                    </Label>
                    <div>
                      {platform === "web" ? (
                        websites.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border p-3 text-xs text-center bg-secondary/20">
                            <p className="text-muted-foreground font-semibold">No verified websites connected.</p>
                            <Link to="/websites"><Button size="sm" variant="link" className="text-primary hover:underline px-0 mt-1 font-semibold text-xs">Verify domain first →</Button></Link>
                          </div>
                        ) : (
                          <Select value={links[0]} onValueChange={(v) => setLinks([v])}>
                            <SelectTrigger className="rounded-lg border-border/80 bg-background h-10 text-xs font-semibold"><SelectValue placeholder="Pick a verified website" /></SelectTrigger>
                            <SelectContent className="border-border">{websites.map((s) => <SelectItem key={s.id} value={s.domain} className="text-xs font-medium">{s.domain}</SelectItem>)}</SelectContent>
                          </Select>
                        )
                      ) : platform === "mobile" ? (
                        <div className="space-y-2">
                          {links.map((l, i) => (
                            <div key={i} className="flex gap-2">
                              <Input value={l} placeholder={PLATFORM_META[platform]?.placeholder || "https://..."} className="rounded-lg border-border/80 bg-background h-10 text-xs"
                                onChange={(e) => setLinks(links.map((x, j) => j === i ? e.target.value : x))} />
                              {links.length > 1 && (
                                <Button variant="outline" size="icon" className="rounded-lg shrink-0 h-10 w-10" onClick={() => setLinks(links.filter((_, j) => j !== i))}>✕</Button>
                              )}
                            </div>
                          ))}
                          {links.length < 2 && (
                            <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5 rounded-lg mt-0.5 font-semibold text-xs px-2 h-8" onClick={() => setLinks([...links, ""])}>+ Add App Link</Button>
                          )}
                        </div>
                      ) : (
                        <Input
                          value={links[0] || ""}
                          className="rounded-lg border-border/80 bg-background h-10 text-xs"
                          placeholder={PLATFORM_META[platform]?.placeholder || "https://..."}
                          onChange={(e) => setLinks([e.target.value])}
                        />
                      )}
                    </div>
                  </div>

                  {/* Payment Methods buttons */}
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Choose Payment Gateway</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setPayMethod("wallet")}
                        className={`rounded-lg border p-3 text-left transition-all flex flex-col justify-between min-h-[85px] relative ${payMethod === "wallet" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-secondary/20"}`}>
                        {payMethod === "wallet" && (
                          <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                        <Wallet className={`h-4 w-4 ${payMethod === "wallet" ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="mt-2">
                          <p className="font-semibold text-xs text-foreground">Corporate Wallet</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Balance: ${(wallet?.balance || 0).toFixed(2)}</p>
                        </div>
                      </button>
                      <button type="button" onClick={() => setPayMethod("paystack")}
                        className={`rounded-lg border p-3 text-left transition-all flex flex-col justify-between min-h-[85px] relative ${payMethod === "paystack" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-secondary/20"}`}>
                        {payMethod === "paystack" && (
                          <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                        <CreditCard className={`h-4 w-4 ${payMethod === "paystack" ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="mt-2">
                          <p className="font-semibold text-xs text-foreground">Paystack Engine</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Card, Bank, USSD</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Summary calculation card - Modernized (Loud Pro inspired) */}
                  <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Upfront billing amount</span>
                      <span className="text-xl font-bold text-foreground font-mono tabular-nums">${flatTotal.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-border/40 pt-2.5">
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {commissionOnly
                          ? `${units.toLocaleString()} users × $${COMMISSION_RESERVE_PER_USER}/user reserve locked in escrow to fund per-sale commissions.`
                          : needsDuration
                          ? `${units.toLocaleString()} users × ${duration} days × selected flat milestones.`
                          : `${units.toLocaleString()} users × selected flat milestones.`}
                      </p>
                      {commissionRows.length > 0 && (
                        <p className="text-[11px] font-semibold text-primary mt-1">
                          + {commissionRows.map((c) => `${c.commission_pct}% per sale`).join(", ")} deducted upon delivery verification.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-6 border-t border-border/30 pt-4 gap-2 flex items-center justify-end">
                  <Button variant="outline" className="rounded-lg font-medium border-border/80 text-xs px-4 h-10" onClick={() => setSelected(null)}>Cancel</Button>
                  <Button onClick={submit} className="rounded-lg font-semibold text-xs px-5 h-10 shadow-none hover:bg-primary/95" disabled={buying || flatTotal <= 0 || (platform === "web" && websites.length === 0)}>
                    {buying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                    {buying ? "Processing..." : `Confirm: $${flatTotal.toFixed(2)}`}
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
