import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MotionWrapper from "@/components/MotionWrapper";
import Sparkline from "@/components/Sparkline";
import AnimatedDonut from "@/components/AnimatedDonut";
import {
  Plus, BarChart3, Tag, ArrowUpRight, ArrowRight, RefreshCw,
  Sparkles, Repeat2, Wallet, Lock, Package as PackageIcon,
  TrendingUp, Activity, MousePointer, CreditCard, Layers, ArrowDownRight
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Campaign {
  id: string; name: string; status: string; budget_remaining: number; created_at: string;
  target_users?: number; selected_milestones?: string[];
}
interface DailyData { date: string; events: number; }

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  pending:  "bg-amber-500/10 text-amber-500 border-amber-500/20",
  rejected: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  paused:   "bg-muted text-muted-foreground border-border",
  completed:"bg-blue-500/10 text-blue-500 border-blue-500/20",
};

/** Turns "https://www.cabally.com" into "Cabally" so offers can be personalised. */
function brandFromProfile(website?: string | null, companyName?: string | null): string {
  const raw = (website || "").trim().toLowerCase();
  if (raw) {
    const host = raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    const label = host.split(".")[0];
    if (label) return label.charAt(0).toUpperCase() + label.slice(1);
  }
  if (companyName && companyName.trim()) return companyName.trim();
  return "your platform";
}

/** Buckets timestamps into an N-day series ending today. */
function toSeries(timestamps: string[], days = 14): number[] {
  const buckets = new Array(days).fill(0);
  const now = Date.now();
  timestamps.forEach((ts) => {
    const diff = Math.floor((now - new Date(ts).getTime()) / 86400000);
    const idx = days - 1 - diff;
    if (idx >= 0 && idx < days) buckets[idx] += 1;
  });
  return buckets;
}

/** Continuous 30-day axis so the chart never renders as a jagged, gap-filled line. */
function buildDailyAxis(days = 30): { key: string; label: string; events: number }[] {
  const out: { key: string; label: string; events: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    out.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      events: 0,
    });
  }
  return out;
}

function pctDelta(series: number[]): number | null {
  if (series.length < 4) return null;
  const half = Math.floor(series.length / 2);
  const prev = series.slice(0, half).reduce((a, b) => a + b, 0);
  const curr = series.slice(half).reduce((a, b) => a + b, 0);
  if (prev === 0) return curr > 0 ? 100 : null;
  return ((curr - prev) / prev) * 100;
}

export default function Dashboard() {
  const { user, walletActivated, advertiserType } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({ totalEvents: 0, totalSpent: 0, totalClicks: 0, delivered: 0 });
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [packageCount, setPackageCount] = useState(0);
  const [packageOrders, setPackageOrders] = useState<any[]>([]);
  const [switchOffers, setSwitchOffers] = useState<any[]>([]);
  const [brandName, setBrandName] = useState<string>("your platform");
  const [eventSeries, setEventSeries] = useState<number[]>([]);
  const [clickSeries, setClickSeries] = useState<number[]>([]);
  const [spendSeries, setSpendSeries] = useState<number[]>([]);
  const [deliverySeries, setDeliverySeries] = useState<number[]>([]);
  const [campaignSeries, setCampaignSeries] = useState<Record<string, number[]>>({});

  const isOffline = advertiserType === "offline";
  const needsActivation = !isOffline && walletActivated !== true;

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: catData } = await supabase
        .from("advertiser_categories")
        .select("category_id, advertiser_subtype, categories(name)")
        .eq("advertiser_id", user.id)
        .maybeSingle();
      if (catData) setCategoryName((catData as { categories?: { name?: string } | null })?.categories?.name || null);
      const subtype = (catData as { advertiser_subtype?: string } | null)?.advertiser_subtype;

      const { data: profile } = await supabase
        .from("profiles")
        .select("website, company_name")
        .eq("id", user.id)
        .maybeSingle();
      setBrandName(brandFromProfile((profile as any)?.website, (profile as any)?.company_name));

      if (subtype) {
        const { data: pkgs } = await supabase
          .from("ad_packages")
          .select("id")
          .eq("is_active", true)
          .contains("advertiser_subtypes", [subtype])
          .limit(12);
        setPackageCount((pkgs || []).length);

        const { data: offers } = await supabase
          .from("switch_offers" as any)
          .select("*")
          .eq("is_active", true)
          .contains("advertiser_subtypes", [subtype])
          .order("created_at", { ascending: false })
          .limit(3);
        const offerList = (offers as any[]) || [];
        const compIds = [...new Set(offerList.map((o) => o.competitor_app_id).filter(Boolean))];
        const compMap: Record<string, { name: string; logo_url: string | null }> = {};
        if (compIds.length > 0) {
          const { data: comps } = await supabase
            .from("competitor_apps" as any)
            .select("id,name,logo_url")
            .in("id", compIds);
          ((comps as any[]) || []).forEach((c) => { compMap[c.id] = { name: c.name, logo_url: c.logo_url }; });
        }
        setSwitchOffers(offerList.map((o) => ({
          ...o,
          competitor_name: compMap[o.competitor_app_id]?.name || null,
          competitor_logo: compMap[o.competitor_app_id]?.logo_url || null,
        })));
      }

      const { data: campaignsData } = await supabase
        .from("campaigns").select("*").eq("advertiser_id", user.id)
        .order("created_at", { ascending: false });
      setCampaigns((campaignsData as Campaign[]) || []);

      const { data: orders } = await supabase
        .from("package_orders" as any).select("*").eq("advertiser_id", user.id)
        .order("created_at", { ascending: false });
      const orderList = (orders as any[]) || [];
      setPackageOrders(orderList);

      // ---- Performance axis: continuous 30 days, events + package deliveries ----
      const axis = buildDailyAxis(30);
      const axisIdx: Record<string, number> = {};
      axis.forEach((d, i) => { axisIdx[d.key] = i; });
      let hasAnySeriesPoint = false;

      if (orderList.length > 0) {
        const orderIds = orderList.map((o) => o.id);
        const { data: deliveries } = await supabase
          .from("package_order_deliveries" as any)
          .select("delivery_date, users_delivered")
          .in("order_id", orderIds)
          .gte("delivery_date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
        const dlist = (deliveries as any[]) || [];
        let deliveredTotal = 0;
        dlist.forEach((d) => {
          const key = String(d.delivery_date).slice(0, 10);
          deliveredTotal += Number(d.users_delivered) || 0;
          if (key in axisIdx) {
            axis[axisIdx[key]].events += Number(d.users_delivered) || 0;
            hasAnySeriesPoint = true;
          }
        });
        setStats((s) => ({ ...s, delivered: deliveredTotal }));
        setDeliverySeries(toSeries(dlist.flatMap((d) =>
          new Array(Math.min(Number(d.users_delivered) || 0, 200)).fill(`${d.delivery_date}T12:00:00Z`))));
      }

      if (campaignsData && campaignsData.length > 0) {
        const campaignIds = campaignsData.map((c: Campaign) => c.id);
        const { count: eventsCount } = await supabase
          .from("events").select("*", { count: "exact", head: true }).in("campaign_id", campaignIds);
        const { data: txData } = await supabase
          .from("transactions").select("amount, created_at").in("campaign_id", campaignIds);
        const { data: referralData } = await supabase
          .from("referrals").select("id").in("campaign_id", campaignIds);
        const referralIds = referralData?.map((r) => r.id) || [];
        const { count: clicksCount } = referralIds.length > 0
          ? await supabase.from("clicks").select("*", { count: "exact", head: true }).in("referral_id", referralIds)
          : { count: 0 };
        const totalSpent = txData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        setStats((s) => ({ ...s, totalEvents: eventsCount || 0, totalSpent, totalClicks: clicksCount || 0 }));
        setSpendSeries(toSeries((txData || []).map((t: any) => t.created_at)));

        if (referralIds.length > 0) {
          const { data: recentClicks } = await supabase
            .from("clicks").select("created_at").in("referral_id", referralIds)
            .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString());
          setClickSeries(toSeries((recentClicks || []).map((c: any) => c.created_at)));
        }

        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data: events } = await supabase
          .from("events").select("created_at, campaign_id").in("campaign_id", campaignIds).gte("created_at", thirtyDaysAgo);
        if (events && events.length > 0) {
          events.forEach((e) => {
            const key = new Date(e.created_at).toISOString().slice(0, 10);
            if (key in axisIdx) { axis[axisIdx[key]].events += 1; hasAnySeriesPoint = true; }
          });
          setEventSeries(toSeries(events.map((e: any) => e.created_at)));

          const perCampaign: Record<string, string[]> = {};
          events.forEach((e: any) => { (perCampaign[e.campaign_id] ||= []).push(e.created_at); });
          const series: Record<string, number[]> = {};
          Object.entries(perCampaign).forEach(([id, list]) => { series[id] = toSeries(list); });
          setCampaignSeries(series);
        }
      }

      setDailyData(hasAnySeriesPoint ? axis.map((d) => ({ date: d.label, events: d.events })) : []);
      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const pendingCampaigns = campaigns.filter((c) => c.status === "pending").length;
  const otherCampaigns = campaigns.length - activeCampaigns - pendingCampaigns;
  const activeOrders = packageOrders.filter((o) => o.status === "active").length;
  const firstName = user?.email?.split("@")[0] || "there";

  const statusClass = (s: string) => STATUS_STYLES[s] || "bg-muted text-muted-foreground border-border";
  const fallback = (arr: number[]) => (arr.length ? arr : new Array(14).fill(0));

  const statCards = [
    { label: "Total events", value: stats.totalEvents.toLocaleString(), hint: "All tracked activity", delta: pctDelta(eventSeries), to: "/ads", icon: TrendingUp },
    { label: "Users delivered", value: stats.delivered.toLocaleString(), hint: "From ad packages", delta: pctDelta(deliverySeries), to: "/packages/orders", icon: Layers },
    { label: "Clicks", value: stats.totalClicks.toLocaleString(), hint: "Verified clicks", delta: pctDelta(clickSeries), to: "/ads", icon: MousePointer },
    { label: "Total spent", value: `$${stats.totalSpent.toFixed(2)}`, hint: "Across all campaigns", delta: pctDelta(spendSeries), to: "/wallet", icon: CreditCard },
    { label: "Running", value: (activeCampaigns + activeOrders).toString(), hint: "Live campaigns & packages", delta: null, to: "/ads", icon: Activity },
  ];

  return (
    <DashboardLayout>
      {!needsActivation && packageCount > 0 && <GiftReveal count={packageCount} />}
      <AiModePrompt />

      <div className="mx-auto w-full max-w-[1400px] space-y-6">
        {/* Greeting */}
        <MotionWrapper>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
              <h1 className="text-[2rem] font-semibold leading-tight tracking-tight text-foreground md:text-[2.6rem]">
                Welcome back, {firstName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Here is how your migrations are going.</span>
                {categoryName && (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                      <Tag className="h-3 w-3 text-primary" />
                      {categoryName}
                    </span>
                    <Link to="/category-select" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      <RefreshCw className="h-3 w-3" /> change
                    </Link>
                  </>
                )}
              </div>
            </div>
            {!needsActivation && (
              <Link to="/campaigns/create" className="self-start lg:self-auto">
                <Button size="lg" className="gap-2 rounded-full px-5 font-semibold">
                  <Plus className="h-4 w-4" /> New campaign
                </Button>
              </Link>
            )}
          </div>
        </MotionWrapper>

        {/* Activation notice */}
        {needsActivation && (
          <MotionWrapper delay={0.03}>
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Your account is not activated yet</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Explore freely. Deposit $25 into your wallet to unlock campaigns, ad packages and switch offers.
                </p>
              </div>
              <Link to="/wallet" className="shrink-0">
                <Button size="sm" className="w-full gap-1.5 rounded-full font-semibold sm:w-auto">
                  <Wallet className="h-4 w-4" /> Activate with $25
                </Button>
              </Link>
            </div>
          </MotionWrapper>
        )}

        {/* Stat strip */}
        <MotionWrapper delay={0.05}>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <Link key={s.label} to={s.to} className="group bg-card p-5 transition-colors hover:bg-accent/40">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    <p className="text-xs font-medium">{s.label}</p>
                  </div>
                  <p className="mt-3 text-[1.75rem] font-semibold leading-none tabular-nums tracking-tight text-foreground">
                    {s.value}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    {s.delta !== null && (
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${s.delta >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500"}`}>
                        {s.delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(s.delta).toFixed(1)}%
                      </span>
                    )}
                    <span className="truncate text-xs text-muted-foreground">{s.hint}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </MotionWrapper>

        {/* Ad packages gift */}
        {packageCount > 0 && (
          <MotionWrapper delay={0.07}>
            <Link to="/packages" className="group block">
              <div className="relative flex flex-col items-start gap-5 overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-lg sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-end justify-center rounded-2xl bg-primary/5">
                  <div className="pb-3">
                    <GiftBox size={64} shake />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">A gift for your brand</p>
                  <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
                    {packageCount} ready-made ad {packageCount === 1 ? "package" : "packages"} wrapped for {brandName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pick your milestones, set your volume and go live without building a campaign.
                  </p>
                </div>
                <Button className="shrink-0 gap-2 rounded-full px-5 font-semibold">
                  Unwrap <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </Link>
          </MotionWrapper>
        )}

        {/* Switch offers — migration stories */}
        {switchOffers.length > 0 && (
          <MotionWrapper delay={0.09}>
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    Users ready to switch to {brandName}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Real cohorts leaving competing brands. Claim them before someone else does.
                  </p>
                </div>
                <Link to="/switch-offers" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {switchOffers.map((o) => (
                  <SwitchStoryCard
                    key={o.id}
                    competitorName={o.competitor_name || "Competitor"}
                    competitorLogo={o.competitor_logo}
                    brandName={brandName}
                    count={Number(o.batch_size)}
                    price={Number(o.flat_price_usd)}
                    platform={o.platform}
                    note={o.title}
                    onAction={() => { window.location.href = "/switch-offers"; }}
                  />
                ))}
              </div>
            </section>
          </MotionWrapper>
        )}


        {/* Premium Analytics display based on provided samples */}
        <MotionWrapper delay={0.1}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main chart section (Sales/Events Overview theme) */}
            <div className="rounded-xl border border-border bg-card/40 backdrop-blur-md overflow-hidden lg:col-span-2 premium-shadow flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4.5 border-b border-border bg-card/20">
                <div>
                  <h3 className="text-base font-bold tracking-tight">Performance vs Benchmarks</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Live aggregated system-wide conversions and events</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Activity
                  </span>
                  <Badge variant="outline" className="text-xs font-semibold px-2 py-1 bg-background/50">30D</Badge>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-center">
                {dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={290}>
                    <AreaChart data={dailyData} margin={{ top: 12, right: 16, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPrimaryGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 4" vertical={false} opacity={0.6} />
                      <XAxis
                        dataKey="date" axisLine={false} tickLine={false}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
                        dy={8} minTickGap={40} interval="preserveStartEnd"
                      />
                      <YAxis
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1.5, strokeDasharray: "3 3" }}
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: 12,
                          color: "hsl(var(--foreground))",
                          padding: "10px 14px",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
                        }}
                        labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600, marginBottom: 4 }}
                      />
                      <Area
                        type="monotone" dataKey="events" name="Total Activity"
                        stroke="hsl(var(--primary))" strokeWidth={2}
                        fillOpacity={1} fill="url(#colorPrimaryGrad)"
                        dot={{ r: 1, strokeWidth: 1 }}
                        activeDot={{ r: 5, strokeWidth: 1.5, stroke: "hsl(var(--background))", fill: "hsl(var(--primary))" }}
                        animationDuration={1200}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[290px]">
                    <div className="text-center px-6">
                      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted border border-border">
                        <BarChart3 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">No activity metrics yet</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        This chart fills up as your campaigns and package orders start delivering conversion events.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Side breakdown / campaign mix */}
            <div className="rounded-xl border border-border bg-card/40 backdrop-blur-md flex flex-col premium-shadow">
              <div className="border-b border-border px-5 py-4 bg-card/20">
                <h3 className="text-base font-bold tracking-tight">Portfolio Allocation</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Campaign status distribution</p>
              </div>
              <div className="flex flex-1 items-center justify-center p-6">
                <AnimatedDonut
                  segments={[
                    { label: "Active", value: activeCampaigns, color: "hsl(var(--primary))" },
                    { label: "Pending", value: pendingCampaigns, color: "hsl(var(--warning))" },
                    { label: "Other", value: Math.max(otherCampaigns, 0), color: "hsl(var(--muted-foreground) / 0.4)" },
                  ]}
                  centerValue={campaigns.length.toString()}
                  centerLabel="campaigns"
                />
              </div>
            </div>
          </div>
        </MotionWrapper>

        {/* Live campaigns table with animated graph lines */}
        <MotionWrapper delay={0.12}>
          <div className="rounded-xl border border-border bg-card/40 backdrop-blur-md overflow-hidden premium-shadow">
            <div className="flex items-center justify-between gap-3 px-6 py-4.5 border-b border-border bg-card/20">
              <h3 className="text-base font-bold tracking-tight">Live Campaign Metrics</h3>
              <Link to="/ads" className="inline-flex items-center gap-1 text-xs text-primary hover:underline transition-colors font-semibold">
                View detailed list <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center py-14">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : campaigns.length === 0 && packageOrders.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 border border-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">No active campaigns or orders yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-5">
                  Launch your first campaign to start reaching real customers on our network.
                </p>
                <Link to={needsActivation ? "/wallet" : "/campaigns/create"}>
                  <Button size="sm" className="font-semibold shadow-md shadow-primary/25">
                    <Plus className="mr-1.5 h-4 w-4" /> {needsActivation ? "Activate to start" : "Create campaign"}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/20">
                      <th className="px-6 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Source Type</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Value Details</th>
                      <th className="hidden px-4 py-3 font-semibold sm:table-cell">Live Trend (Animated)</th>
                      <th className="px-6 py-3 font-semibold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {packageOrders.slice(0, 5).map((o) => (
                      <tr key={`o-${o.id}`} className="transition-colors hover:bg-accent/30">
                        <td className="px-6 py-4.5">
                          <Link to="/packages/orders" className="font-semibold text-foreground hover:text-primary transition-colors">
                            {o.package_name}
                          </Link>
                        </td>
                        <td className="px-4 py-4.5 text-xs text-muted-foreground">Ad Package</td>
                        <td className="px-4 py-4.5">
                          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold uppercase ${statusClass(o.status === "pending_review" ? "pending" : o.status)}`}>
                            {o.status === "pending_review" ? "pending" : o.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4.5 text-right tabular-nums text-xs font-medium text-foreground">
                          {Number(o.units).toLocaleString()} units <span className="text-muted-foreground font-normal">·</span> ${Number(o.total_amount_usd || 0).toFixed(2)}
                        </td>
                        <td className="hidden px-4 py-4.5 sm:table-cell">
                          <Sparkline data={fallback(deliverySeries)} tone={o.status === "active" ? "primary" : "muted"} className="h-7 w-28 scale-100 group-hover:scale-105 transition-transform" />
                        </td>
                        <td className="px-6 py-4.5 text-right">
                          <Link to="/packages/orders" className="rounded-lg p-1 hover:bg-accent/40 inline-block transition-colors">
                            <ArrowUpRight className="h-4.5 w-4.5 text-muted-foreground" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {campaigns.slice(0, 8).map((c) => (
                      <tr key={c.id} className="transition-colors hover:bg-accent/30">
                        <td className="px-6 py-4.5">
                          <Link to={`/campaigns/${c.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-4 py-4.5 text-xs text-muted-foreground">Direct Campaign</td>
                        <td className="px-4 py-4.5">
                          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold uppercase ${statusClass(c.status)}`}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4.5 text-right tabular-nums text-xs font-medium text-foreground">
                          ${Number(c.budget_remaining).toFixed(2)} <span className="text-muted-foreground font-normal">left</span>
                        </td>
                        <td className="hidden px-4 py-4.5 sm:table-cell">
                          <Sparkline
                            data={fallback(campaignSeries[c.id] || [])}
                            tone={c.status === "active" ? "primary" : "muted"}
                            className="h-7 w-28 scale-100 group-hover:scale-105 transition-transform"
                          />
                        </td>
                        <td className="px-6 py-4.5 text-right">
                          <Link to={`/campaigns/${c.id}`} className="rounded-lg p-1 hover:bg-accent/40 inline-block transition-colors">
                            <ArrowUpRight className="h-4.5 w-4.5 text-muted-foreground" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </MotionWrapper>
      </div>
    </DashboardLayout>
  );
}
