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
  active:   "bg-primary/10 text-primary border-primary/20",
  pending:  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  paused:   "bg-muted text-muted-foreground border-border",
  completed:"bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
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
  const [hasPackages, setHasPackages] = useState(false);
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
          .limit(1);
        setHasPackages(!!(pkgs && pkgs.length > 0));

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
    { label: "Total events", value: stats.totalEvents.toLocaleString(), hint: "All tracked activity", delta: pctDelta(eventSeries), to: "/ads" },
    { label: "Users delivered", value: stats.delivered.toLocaleString(), hint: "From ad packages", delta: pctDelta(deliverySeries), to: "/packages/orders" },
    { label: "Clicks", value: stats.totalClicks.toLocaleString(), hint: "Verified clicks", delta: pctDelta(clickSeries), to: "/ads" },
    { label: "Total spent", value: `$${stats.totalSpent.toFixed(2)}`, hint: "Across all campaigns", delta: pctDelta(spendSeries), to: "/wallet" },
    { label: "Running", value: (activeCampaigns + activeOrders).toString(), hint: "Live campaigns & packages", delta: null, to: "/ads" },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-5">
        {/* Header */}
        <MotionWrapper>
          <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5 min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">
                Welcome back, {firstName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Live performance across your workspace.</span>
                {categoryName && (
                  <>
                    <span className="text-border">·</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      {categoryName}
                    </span>
                    <Link to="/category-select" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                      <RefreshCw className="h-3 w-3" /> change
                    </Link>
                  </>
                )}
              </div>
            </div>
            {!needsActivation && (
              <Link to="/campaigns/create" className="self-start lg:self-auto">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> New campaign
                </Button>
              </Link>
            )}
          </div>
        </MotionWrapper>

        {/* Activation notice */}
        {needsActivation && (
          <MotionWrapper delay={0.03}>
            <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Lock className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Your account is not activated yet</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Explore freely. Deposit $25 into your wallet to unlock campaigns, ad packages and switch offers.
                </p>
              </div>
              <Link to="/wallet" className="shrink-0">
                <Button size="sm" className="w-full gap-1.5 sm:w-auto">
                  <Wallet className="h-4 w-4" /> Activate with $25
                </Button>
              </Link>
            </div>
          </MotionWrapper>
        )}

        {/* Switch offers — top of the dashboard */}
        {switchOffers.length > 0 && (
          <MotionWrapper delay={0.04}>
            <section className="rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Repeat2 className="h-4 w-4 text-primary shrink-0" />
                  <h2 className="text-sm font-semibold tracking-tight">Users ready to switch to {brandName}</h2>
                </div>
                <Link to="/switch-offers" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <ul className="divide-y divide-border">
                {switchOffers.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    {o.competitor_logo ? (
                      <img src={o.competitor_logo} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                        <Repeat2 className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {Number(o.batch_size).toLocaleString()} {o.competitor_name || ""} users ready to move
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{o.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-foreground">${Number(o.flat_price_usd).toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground">flat</p>
                    </div>
                    <Link to="/switch-offers" className="shrink-0">
                      <Button size="sm" variant="outline" className="gap-1">
                        Switch <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </MotionWrapper>
        )}

        {/* Ad packages — top of the dashboard */}
        {hasPackages && (
          <MotionWrapper delay={0.06}>
            <Link to="/packages" className="group block">
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <PackageIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Ready-to-run ad packages for your category</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Pick your milestones, set your volume and go live without building a campaign.</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </MotionWrapper>
        )}

        {/* Stats strip */}
        <MotionWrapper delay={0.08}>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-5">
            {statCards.map((s) => (
              <Link key={s.label} to={s.to} className="group bg-card p-5 transition-colors hover:bg-accent/40">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{s.value}</p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                  {s.delta !== null ? (
                    <span className={s.delta >= 0 ? "text-primary" : "text-destructive"}>
                      {s.delta >= 0 ? "↑" : "↓"} {Math.abs(s.delta).toFixed(1)}%
                    </span>
                  ) : null}
                  <span className="text-muted-foreground">{s.hint}</span>
                </div>
              </Link>
            ))}
          </div>
        </MotionWrapper>

        {/* Performance + mix */}
        <MotionWrapper delay={0.1}>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card overflow-hidden lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">Total performance</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Events and delivered users · last 30 days</p>
                </div>
                <Badge variant="outline" className="text-[11px] font-normal">30D</Badge>
              </div>
              <div className="px-1 py-4 sm:px-2">
                {dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={dailyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.16} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 6" vertical={false} />
                      <XAxis
                        dataKey="date" axisLine={false} tickLine={false}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        dy={10} minTickGap={40} interval="preserveStartEnd"
                      />
                      <YAxis
                        axisLine={false} tickLine={false} width={34}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: 12,
                          color: "hsl(var(--foreground))",
                          padding: "8px 10px",
                        }}
                        labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      />
                      <Area
                        type="monotone" dataKey="events" name="Activity"
                        stroke="hsl(var(--primary))" strokeWidth={1.25}
                        fillOpacity={1} fill="url(#colorEvents)"
                        dot={false}
                        activeDot={{ r: 3, strokeWidth: 1.25 }}
                        animationDuration={900}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px]">
                    <div className="text-center px-6">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No activity yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This chart fills up as your campaigns and packages start delivering.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card flex flex-col">
              <div className="border-b border-border px-5 py-3.5">
                <h3 className="text-sm font-semibold tracking-tight">Portfolio status</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Campaign mix</p>
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

        {/* Campaigns table */}
        <MotionWrapper delay={0.12}>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold tracking-tight">Your campaigns</h3>
              <Link to="/ads" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center py-14">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : campaigns.length === 0 && packageOrders.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">No campaigns yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-5">
                  Launch your first campaign to start reaching real customers.
                </p>
                <Link to={needsActivation ? "/wallet" : "/campaigns/create"}>
                  <Button size="sm">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> {needsActivation ? "Activate to start" : "Create campaign"}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-5 py-2.5 font-normal">Name</th>
                      <th className="px-3 py-2.5 font-normal">Source</th>
                      <th className="px-3 py-2.5 font-normal">Status</th>
                      <th className="px-3 py-2.5 font-normal text-right">Value</th>
                      <th className="hidden px-3 py-2.5 font-normal sm:table-cell">Trend</th>
                      <th className="px-5 py-2.5 font-normal" />
                    </tr>
                  </thead>
                  <tbody>
                    {packageOrders.slice(0, 5).map((o) => (
                      <tr key={`o-${o.id}`} className="border-b border-border last:border-0 transition-colors hover:bg-accent/40">
                        <td className="px-5 py-3">
                          <Link to="/packages/orders" className="font-medium text-foreground hover:text-primary transition-colors">
                            {o.package_name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">Package</td>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${statusClass(o.status === "pending_review" ? "pending" : o.status)}`}>
                            {o.status === "pending_review" ? "pending" : o.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-xs text-muted-foreground">
                          {Number(o.units).toLocaleString()} units · ${Number(o.total_amount_usd || 0).toFixed(2)}
                        </td>
                        <td className="hidden px-3 py-3 sm:table-cell">
                          <Sparkline data={fallback(deliverySeries)} tone={o.status === "active" ? "primary" : "muted"} className="h-7 w-24" />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link to="/packages/orders"><ArrowUpRight className="h-4 w-4 text-muted-foreground/50" /></Link>
                        </td>
                      </tr>
                    ))}
                    {campaigns.slice(0, 8).map((c) => (
                      <tr key={c.id} className="border-b border-border last:border-0 transition-colors hover:bg-accent/40">
                        <td className="px-5 py-3">
                          <Link to={`/campaigns/${c.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">Campaign</td>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${statusClass(c.status)}`}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-xs text-muted-foreground">
                          ${Number(c.budget_remaining).toFixed(2)} left
                        </td>
                        <td className="hidden px-3 py-3 sm:table-cell">
                          <Sparkline
                            data={fallback(campaignSeries[c.id] || [])}
                            tone={c.status === "active" ? "primary" : "muted"}
                            className="h-7 w-24"
                          />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link to={`/campaigns/${c.id}`}><ArrowUpRight className="h-4 w-4 text-muted-foreground/50" /></Link>
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
