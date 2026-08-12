import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { toast } from "sonner";
import { CheckCircle, XCircle, BarChart3, DollarSign, Users, RefreshCw, MousePointerClick, Activity, TrendingUp } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { ListSkeleton } from "@/components/skeletons";

type CampaignWithProfile = Tables<"campaigns"> & {
  profiles: { email: string; full_name: string | null } | null;
};

interface DailyData { date: string; events: number; revenue: number; clicks: number; }
interface CategoryChangeReq {
  id: string; advertiser_id: string; current_category_id: string;
  requested_category_id: string; reason: string; status: string; created_at: string;
  advertiser_email?: string; current_name?: string; requested_name?: string;
}
interface TrackerVersionDistribution {
  version: string;
  campaigns: number;
}

const CHART_COLORS = ["hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(217, 91%, 60%)", "hsl(0, 72%, 50%)"];
const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: 12 };
const DRAFT_PLACEHOLDER_NAMES = new Set([
  "draft campaign",
  "draft commerce campaign",
  "external referral - draft",
]);

const isAdminVisibleCampaign = (campaign: Tables<"campaigns">) => {
  const normalizedName = String(campaign.name || "").trim().toLowerCase();
  return (
    !campaign.is_draft &&
    !DRAFT_PLACEHOLDER_NAMES.has(normalizedName) &&
    !normalizedName.startsWith("external referral - draft") &&
    Number(campaign.total_cost || 0) > 0
  );
};

export default function AdminDashboard() {
  const [campaigns, setCampaigns] = useState<CampaignWithProfile[]>([]);
  const [stats, setStats] = useState({ totalCampaigns: 0, totalEvents: 0, totalRevenue: 0, totalClicks: 0, totalAdvertisers: 0, activeWallets: 0 });
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [eventBreakdown, setEventBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [categoryRequests, setCategoryRequests] = useState<CategoryChangeReq[]>([]);
  const [trackerDistribution, setTrackerDistribution] = useState<TrackerVersionDistribution[]>([]);
  const [pendingPackageOrders, setPendingPackageOrders] = useState<any[]>([]);

  const fetchData = async () => {
    const { data: allCampaigns } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    const visibleCampaigns = ((allCampaigns || []) as Tables<"campaigns">[]).filter(isAdminVisibleCampaign);
    const advertiserIds = [...new Set(visibleCampaigns.map(c => c.advertiser_id))];
    const { data: profilesData } = advertiserIds.length > 0
      ? await supabase.from("profiles").select("id, email, full_name").in("id", advertiserIds)
      : { data: [] };
    const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
    const campaignsWithProfiles = visibleCampaigns.map(c => ({ ...c, profiles: profilesMap.get(c.advertiser_id) || null }));
    setCampaigns(campaignsWithProfiles as CampaignWithProfile[]);

    const [eventsRes, txRes, clicksRes, advertisersRes, walletsRes, dlRes, suRes, puRes] = await Promise.all([
      supabase.from("events").select("*", { count: "exact", head: true }),
      supabase.from("transactions").select("amount"),
      supabase.from("clicks").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("wallets").select("*", { count: "exact", head: true }).eq("is_activated", true),
      supabase.from("events").select("*", { count: "exact", head: true }).eq("event_type", "download"),
      supabase.from("events").select("*", { count: "exact", head: true }).eq("event_type", "signup"),
      supabase.from("events").select("*", { count: "exact", head: true }).eq("event_type", "purchase"),
    ]);

    const totalRevenue = txRes.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    setStats({
      totalCampaigns: visibleCampaigns.length,
      totalEvents: eventsRes.count || 0,
      totalRevenue,
      totalClicks: clicksRes.count || 0,
      totalAdvertisers: advertisersRes.count || 0,
      activeWallets: walletsRes.count || 0,
    });

    setEventBreakdown([
      { name: "Downloads", value: dlRes.count || 0 },
      { name: "Signups", value: suRes.count || 0 },
      { name: "Purchases", value: puRes.count || 0 },
    ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: events }, { data: txRecent }, { data: clicksRecent }] = await Promise.all([
      supabase.from("events").select("created_at").gte("created_at", thirtyDaysAgo),
      supabase.from("transactions").select("amount, created_at").gte("created_at", thirtyDaysAgo),
      supabase.from("clicks").select("created_at").gte("created_at", thirtyDaysAgo),
    ]);
    const byDay: Record<string, DailyData> = {};
    const addDay = (dateStr: string) => {
      const day = new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!byDay[day]) byDay[day] = { date: day, events: 0, revenue: 0, clicks: 0 };
      return day;
    };
    events?.forEach(e => { byDay[addDay(e.created_at)].events++; });
    txRecent?.forEach(t => { byDay[addDay(t.created_at)].revenue += Number(t.amount); });
    clicksRecent?.forEach(c => { byDay[addDay(c.created_at)].clicks++; });
    setDailyData(Object.values(byDay));

    const { data: reqData } = await supabase.from("category_change_requests" as any).select("*").eq("status", "pending").order("created_at", { ascending: false });
    if (reqData && (reqData as any[]).length > 0) {
      const reqs = reqData as any as CategoryChangeReq[];
      const reqAdvIds = [...new Set(reqs.map(r => r.advertiser_id))];
      const catIds = [...new Set([...reqs.map(r => r.current_category_id), ...reqs.map(r => r.requested_category_id)])];
      const [{ data: reqProfiles }, { data: reqCats }] = await Promise.all([
        supabase.from("profiles").select("id, email").in("id", reqAdvIds),
        supabase.from("categories").select("id, name").in("id", catIds),
      ]);
      const profMap = new Map((reqProfiles || []).map(p => [p.id, p.email]));
      const catMap = new Map((reqCats || []).map(c => [c.id, c.name]));
      setCategoryRequests(reqs.map(r => ({
        ...r,
        advertiser_email: profMap.get(r.advertiser_id) || "Unknown",
        current_name: catMap.get(r.current_category_id) || "Unknown",
        requested_name: catMap.get(r.requested_category_id) || "Unknown",
      })));
    }

    const { data: installs } = await supabase
      .from("campaign_tracker_installs" as any)
      .select("tracker_releases(version)");
    const distributionMap = new Map<string, number>();
    (installs || []).forEach((row: any) => {
      const version = row?.tracker_releases?.version || "legacy";
      distributionMap.set(version, (distributionMap.get(version) || 0) + 1);
    });
    setTrackerDistribution(
      Array.from(distributionMap.entries())
        .map(([version, campaigns]) => ({ version, campaigns }))
        .sort((a, b) => b.campaigns - a.campaigns)
    );

    const { data: pkgOrders } = await supabase
      .from("package_orders" as any)
      .select("*")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false });
    const orderAdvIds = [...new Set(((pkgOrders as any[]) || []).map((o: any) => o.advertiser_id))];
    const { data: orderProfiles } = orderAdvIds.length
      ? await supabase.from("profiles").select("id, email").in("id", orderAdvIds)
      : { data: [] as any[] };
    const orderProfMap = new Map((orderProfiles || []).map((p: any) => [p.id, p.email]));
    setPendingPackageOrders(((pkgOrders as any[]) || []).map((o: any) => ({ ...o, advertiser_email: orderProfMap.get(o.advertiser_id) || "Unknown" })));

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateCampaignStatus = async (campaignId: string, status: "active" | "pending" | "rejected") => {
    const { error } = await supabase.from("campaigns").update({ status, is_draft: false }).eq("id", campaignId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Campaign ${status}`);
    if (status === "active") {
      const code = `ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      await supabase.functions.invoke("manage-campaign", { body: { action: "create_referral", campaign_id: campaignId, code } });
    }
    fetchData();
  };

  const handleCategoryChangeRequest = async (reqId: string, action: "approved" | "rejected", req: CategoryChangeReq) => {
    if (action === "approved") {
      await supabase.from("advertiser_categories").update({ category_id: req.requested_category_id, status: "active" }).eq("advertiser_id", req.advertiser_id);
    }
    await supabase.from("category_change_requests" as any).update({ status: action, updated_at: new Date().toISOString() } as any).eq("id", reqId);
    toast.success(`Category change ${action}`);
    fetchData();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-primary/10 text-primary border-primary/20";
      case "pending": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default: return "bg-destructive/10 text-destructive border-destructive/20";
    }
  };

  const pendingCampaigns = campaigns.filter(c => c.status === "pending" && Number(c.total_cost || 0) > 0 && (c.integration_verified || c.integration_type === "external_referral"));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <MotionWrapper>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Platform overview and management</p>
          </div>
        </MotionWrapper>

        {/* Stats Grid */}
        <MotionStagger className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Advertisers", value: stats.totalAdvertisers, icon: Users },
            { label: "Campaigns", value: stats.totalCampaigns, icon: BarChart3 },
            { label: "Events", value: stats.totalEvents.toLocaleString(), icon: Activity },
            { label: "Clicks", value: stats.totalClicks.toLocaleString(), icon: MousePointerClick },
            { label: "Revenue", value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign },
            { label: "Active Wallets", value: stats.activeWallets, icon: TrendingUp },
          ].map((s) => (
            <MotionItem key={s.label}>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <s.icon className="h-3.5 w-3.5 text-muted-foreground/50" />
                </div>
                <p className="text-xl font-semibold text-foreground">{s.value}</p>
              </div>
            </MotionItem>
          ))}
        </MotionStagger>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Activity Trend */}
          <MotionWrapper delay={0.05} className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-medium text-foreground mb-1">Platform Activity</h3>
              <p className="text-xs text-muted-foreground mb-4">Last 30 days</p>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="aEvents" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.15} /><stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} /></linearGradient>
                      <linearGradient id="aClicks" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.15} /><stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} /></linearGradient>
                      <linearGradient id="aRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.15} /><stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="clicks" stroke="hsl(217, 91%, 60%)" strokeWidth={1.5} fillOpacity={1} fill="url(#aClicks)" name="Clicks" />
                    <Area type="monotone" dataKey="events" stroke="hsl(160, 84%, 39%)" strokeWidth={1.5} fillOpacity={1} fill="url(#aEvents)" name="Events" />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(38, 92%, 50%)" strokeWidth={1.5} fillOpacity={1} fill="url(#aRevenue)" name="Revenue ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">No data yet</div>
              )}
            </div>
          </MotionWrapper>

          {/* Event Breakdown Pie */}
          <MotionWrapper delay={0.1}>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-medium text-foreground mb-1">Event Breakdown</h3>
              <p className="text-xs text-muted-foreground mb-4">All time</p>
              {eventBreakdown.some(e => e.value > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={eventBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}>
                      {eventBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">No events yet</div>
              )}
            </div>
          </MotionWrapper>
        </div>

        {/* Category Change Requests */}
        <MotionWrapper delay={0.11}>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-3">Tracker Version Distribution</h3>
            {trackerDistribution.length > 0 ? (
              <div className="space-y-2">
                {trackerDistribution.map((item) => (
                  <div key={item.version} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="font-medium text-foreground">{item.version}</span>
                    <Badge variant="outline">{item.campaigns} campaign{item.campaigns === 1 ? "" : "s"}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No tracker installs yet.</p>
            )}
          </div>
        </MotionWrapper>

        {/* Category Change Requests */}
        {categoryRequests.length > 0 && (
          <MotionWrapper delay={0.12}>
            <div className="rounded-xl border border-border bg-card">
              <div className="p-5 pb-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Category Change Requests</h3>
              </div>
              <div className="px-5 pb-5 space-y-2">
                {categoryRequests.map(req => (
                  <div key={req.id} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{req.advertiser_email}</p>
                        <p className="text-xs text-muted-foreground">{req.current_name} → <span className="font-medium text-foreground">{req.requested_name}</span></p>
                        <p className="text-xs text-muted-foreground mt-1 italic">"{req.reason}"</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <GlassButton size="sm" onClick={() => handleCategoryChangeRequest(req.id, "approved", req)}>
                          <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                        </GlassButton>
                        <GlassButton size="sm" variant="destructive" onClick={() => handleCategoryChangeRequest(req.id, "rejected", req)}>
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                        </GlassButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </MotionWrapper>
        )}

        {/* Pending Approvals - only non-draft campaigns */}
        <MotionWrapper delay={0.15}>
          <div className="rounded-xl border border-border bg-card">
            <div className="p-5 pb-3">
              <h3 className="text-sm font-medium text-foreground">Pending Approvals</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Only verified campaigns submitted for review</p>
            </div>
            <div className="px-5 pb-5">
              {loading ? (
                <ListSkeleton rows={3} />
              ) : pendingCampaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No pending campaigns</p>
              ) : (
                <div className="divide-y divide-border">
                  {pendingCampaigns.map((c) => (
                    <div key={c.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.profiles?.email || "Unknown"} • Target: {c.target_users} users • ${Number(c.total_cost).toFixed(2)}</p>
                        <div className="flex gap-1 mt-1">
                          {c.ad_type === "engagement" ? (
                            <Badge variant="outline" className="text-[10px] border-primary/20 text-primary/80">quiz interactions</Badge>
                          ) : (
                            (c.selected_milestones || []).map((m: string) => (
                              <Badge key={m} variant="outline" className="text-[10px] capitalize border-primary/20 text-primary/80">{m}</Badge>
                            ))
                          )}
                          {c.integration_verified && <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">✓ Verified</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <GlassButton size="sm" onClick={() => updateCampaignStatus(c.id, "active")}>
                          <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                        </GlassButton>
                        <GlassButton size="sm" variant="destructive" onClick={() => updateCampaignStatus(c.id, "rejected")}>
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                        </GlassButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </MotionWrapper>

        {/* Pending Package Orders */}
        <MotionWrapper delay={0.17}>
          <div className="rounded-xl border border-border bg-card">
            <div className="p-5 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-foreground">Pending Package Orders</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Ad packages awaiting review</p>
              </div>
              <Link to="/admin/packages" className="text-xs text-primary hover:underline">Open packages →</Link>
            </div>
            <div className="px-5 pb-5">
              {pendingPackageOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No pending package orders</p>
              ) : (
                <div className="divide-y divide-border">
                  {pendingPackageOrders.map((o) => (
                    <Link key={o.id} to="/admin/packages" className="flex items-center justify-between gap-3 py-3.5 group">
                      <div>
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{o.package_name}</p>
                        <p className="text-xs text-muted-foreground">{o.advertiser_email} • {o.units} units • ${Number(o.total_amount_usd || 0).toFixed(2)}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">pending</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </MotionWrapper>


        {/* All Campaigns */}
        <MotionWrapper delay={0.2}>
          <div className="rounded-xl border border-border bg-card">
            <div className="p-5 pb-3">
              <h3 className="text-sm font-medium text-foreground">All Campaigns</h3>
              <span className="text-xs text-muted-foreground">{campaigns.length} total</span>
            </div>
            <div className="px-5 pb-5 divide-y divide-border">
              {campaigns.map((c) => (
                <Link key={c.id} to={`/admin/campaigns/${c.id}`} className="flex items-center justify-between py-3 group">
                  <div>
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.profiles?.email || "Unknown"} • ${Number(c.budget_remaining).toFixed(2)}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusColor(c.status)}`}>{c.status}</Badge>
                </Link>
              ))}
            </div>
          </div>
        </MotionWrapper>
      </div>
    </AdminLayout>
  );
}
