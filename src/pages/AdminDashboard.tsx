import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  BarChart3,
  DollarSign,
  Users,
  RefreshCw,
  MousePointerClick,
  Activity,
  TrendingUp,
  Wallet,
  Clock3,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type CampaignWithProfile = Tables<"campaigns"> & {
  profiles: { email: string; full_name: string | null } | null;
};

interface DailyData {
  date: string;
  events: number;
  revenue: number;
  clicks: number;
}

interface CategoryChangeReq {
  id: string;
  advertiser_id: string;
  current_category_id: string;
  requested_category_id: string;
  reason: string;
  status: string;
  created_at: string;
  advertiser_email?: string;
  current_name?: string;
  requested_name?: string;
}

interface TrackerVersionDistribution {
  version: string;
  campaigns: number;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(38 92% 50%)",
  "hsl(217 91% 60%)",
  "hsl(0 72% 50%)",
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "10px",
  color: "hsl(var(--foreground))",
  fontSize: 12,
};

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
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalEvents: 0,
    totalRevenue: 0,
    totalClicks: 0,
    totalAdvertisers: 0,
    activeWallets: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [eventBreakdown, setEventBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [categoryRequests, setCategoryRequests] = useState<CategoryChangeReq[]>([]);
  const [trackerDistribution, setTrackerDistribution] = useState<TrackerVersionDistribution[]>([]);

  const fetchData = async () => {
    setLoading(true);

    const { data: allCampaigns } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    const visibleCampaigns = ((allCampaigns || []) as Tables<"campaigns">[]).filter(isAdminVisibleCampaign);
    const advertiserIds = [...new Set(visibleCampaigns.map((campaign) => campaign.advertiser_id))];

    const { data: profilesData } = advertiserIds.length > 0
      ? await supabase.from("profiles").select("id, email, full_name").in("id", advertiserIds)
      : { data: [] };

    const profilesMap = new Map((profilesData || []).map((profile) => [profile.id, profile]));
    const campaignsWithProfiles = visibleCampaigns.map((campaign) => ({
      ...campaign,
      profiles: profilesMap.get(campaign.advertiser_id) || null,
    }));
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

    const totalRevenue = txRes.data?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) || 0;
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

    events?.forEach((event) => {
      byDay[addDay(event.created_at)].events += 1;
    });
    txRecent?.forEach((transaction) => {
      byDay[addDay(transaction.created_at)].revenue += Number(transaction.amount);
    });
    clicksRecent?.forEach((click) => {
      byDay[addDay(click.created_at)].clicks += 1;
    });
    setDailyData(Object.values(byDay));

    const { data: reqData } = await supabase
      .from("category_change_requests" as any)
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (reqData && (reqData as any[]).length > 0) {
      const requests = reqData as any as CategoryChangeReq[];
      const reqAdvertiserIds = [...new Set(requests.map((request) => request.advertiser_id))];
      const categoryIds = [...new Set([
        ...requests.map((request) => request.current_category_id),
        ...requests.map((request) => request.requested_category_id),
      ])];

      const [{ data: reqProfiles }, { data: reqCats }] = await Promise.all([
        supabase.from("profiles").select("id, email").in("id", reqAdvertiserIds),
        supabase.from("categories").select("id, name").in("id", categoryIds),
      ]);

      const profileMap = new Map((reqProfiles || []).map((profile) => [profile.id, profile.email]));
      const categoryMap = new Map((reqCats || []).map((category) => [category.id, category.name]));

      setCategoryRequests(
        requests.map((request) => ({
          ...request,
          advertiser_email: profileMap.get(request.advertiser_id) || "Unknown",
          current_name: categoryMap.get(request.current_category_id) || "Unknown",
          requested_name: categoryMap.get(request.requested_category_id) || "Unknown",
        })),
      );
    } else {
      setCategoryRequests([]);
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
        .map(([version, total]) => ({ version, campaigns: total }))
        .sort((a, b) => b.campaigns - a.campaigns),
    );

    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const updateCampaignStatus = async (campaignId: string, status: "active" | "pending" | "rejected") => {
    const { error } = await supabase.from("campaigns").update({ status, is_draft: false }).eq("id", campaignId);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Campaign ${status}`);

    if (status === "active") {
      const code = `ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      await supabase.functions.invoke("manage-campaign", {
        body: { action: "create_referral", campaign_id: campaignId, code },
      });
    }

    void fetchData();
  };

  const handleCategoryChangeRequest = async (
    reqId: string,
    action: "approved" | "rejected",
    request: CategoryChangeReq,
  ) => {
    if (action === "approved") {
      await supabase
        .from("advertiser_categories")
        .update({ category_id: request.requested_category_id, status: "active" })
        .eq("advertiser_id", request.advertiser_id);
    }

    await supabase
      .from("category_change_requests" as any)
      .update({ status: action, updated_at: new Date().toISOString() } as any)
      .eq("id", reqId);

    toast.success(`Category change ${action}`);
    void fetchData();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "border-primary/20 bg-primary/10 text-primary";
      case "pending":
        return "border-border bg-muted text-muted-foreground";
      default:
        return "border-destructive/20 bg-destructive/10 text-destructive";
    }
  };

  const pendingCampaigns = campaigns.filter(
    (campaign) =>
      campaign.status === "pending" &&
      Number(campaign.total_cost || 0) > 0 &&
      (campaign.integration_verified || campaign.integration_type === "external_referral"),
  );

  const priorityStats = useMemo(
    () => [
      { label: "Advertisers", value: stats.totalAdvertisers.toLocaleString(), icon: Users, note: "Registered accounts" },
      { label: "Campaigns", value: stats.totalCampaigns.toLocaleString(), icon: BarChart3, note: "Visible campaigns" },
      { label: "Events", value: stats.totalEvents.toLocaleString(), icon: Activity, note: "Tracked actions" },
      { label: "Revenue", value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, note: "Total transactions" },
      { label: "Clicks", value: stats.totalClicks.toLocaleString(), icon: MousePointerClick, note: "Referral traffic" },
      { label: "Wallets", value: stats.activeWallets.toLocaleString(), icon: Wallet, note: "Activated balances" },
    ],
    [stats],
  );

  const recentCampaigns = campaigns.slice(0, 6);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <Card className="border-border shadow-none">
            <CardHeader className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl">Platform overview</CardTitle>
                <CardDescription>Facebook-style dense admin workspace with faster scanning.</CardDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="outline">{pendingCampaigns.length} pending approvals</Badge>
                  <Badge variant="outline">{categoryRequests.length} category requests</Badge>
                  <Badge variant="outline">{trackerDistribution.length} tracker versions</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/admin/advertisers">
                  <Button variant="outline" size="sm">Review advertisers</Button>
                </Link>
                <Link to="/admin/settings">
                  <Button size="sm">Open settings</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {priorityStats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-border bg-muted/40 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold">{stat.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base">Admin focus</CardTitle>
              <CardDescription>Operational priorities that need quick attention.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {[
                {
                  title: "Pending campaign review",
                  value: pendingCampaigns.length,
                  note: pendingCampaigns.length > 0 ? "Ready for approval queue" : "Approval queue is clear",
                  icon: Clock3,
                },
                {
                  title: "Category changes",
                  value: categoryRequests.length,
                  note: categoryRequests.length > 0 ? "Advertisers waiting on action" : "No pending requests",
                  icon: RefreshCw,
                },
                {
                  title: "System readiness",
                  value: stats.activeWallets,
                  note: "Activated wallets across the platform",
                  icon: ShieldCheck,
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      <span className="text-sm font-semibold">{item.value}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <Card className="border-border shadow-none">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base">Activity trend</CardTitle>
              <CardDescription>Platform events, clicks, and revenue over the last 30 days.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="adminEvents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="adminClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="adminRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="clicks" stroke="hsl(217 91% 60%)" strokeWidth={1.8} fill="url(#adminClicks)" name="Clicks" />
                    <Area type="monotone" dataKey="events" stroke="hsl(var(--primary))" strokeWidth={1.8} fill="url(#adminEvents)" name="Events" />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(38 92% 50%)" strokeWidth={1.8} fill="url(#adminRevenue)" name="Revenue ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                  No activity data yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base">Event mix</CardTitle>
              <CardDescription>Distribution of core conversion types.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              {eventBreakdown.some((item) => item.value > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={eventBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={84}
                      innerRadius={46}
                      paddingAngle={2}
                    >
                      {eventBreakdown.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                  No events yet.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Card className="border-border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle className="text-base">Pending approvals</CardTitle>
                <CardDescription>Verified campaigns currently waiting for admin action.</CardDescription>
              </div>
              <Badge variant="outline">{pendingCampaigns.length}</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : pendingCampaigns.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No pending campaigns.</div>
              ) : (
                <div className="divide-y divide-border">
                  {pendingCampaigns.map((campaign) => (
                    <div key={campaign.id} className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{campaign.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {campaign.profiles?.email || "Unknown"} • Target {campaign.target_users || 0} • ${Number(campaign.total_cost || 0).toFixed(2)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {campaign.ad_type === "engagement" ? (
                            <Badge variant="outline">quiz interactions</Badge>
                          ) : (
                            (campaign.selected_milestones || []).map((milestone: string) => (
                              <Badge key={milestone} variant="outline" className="capitalize">{milestone}</Badge>
                            ))
                          )}
                          {campaign.integration_verified && <Badge variant="outline" className="border-primary/20 text-primary">Verified</Badge>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button size="sm" onClick={() => updateCampaignStatus(campaign.id, "active")}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateCampaignStatus(campaign.id, "rejected")}>
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base">Tracker versions</CardTitle>
              <CardDescription>Installed release spread across campaigns.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-5">
              {trackerDistribution.length > 0 ? (
                trackerDistribution.map((item) => (
                  <div key={item.version} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{item.version}</p>
                      <p className="text-xs text-muted-foreground">Campaign tracker release</p>
                    </div>
                    <Badge variant="outline">{item.campaigns}</Badge>
                  </div>
                ))
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No tracker installs yet.</div>
              )}
            </CardContent>
          </Card>
        </section>

        {categoryRequests.length > 0 && (
          <Card className="border-border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle className="text-base">Category change requests</CardTitle>
                <CardDescription>Advertisers waiting on approval to switch categories.</CardDescription>
              </div>
              <Badge variant="outline">{categoryRequests.length}</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y divide-border">
                {categoryRequests.map((request) => (
                  <div key={request.id} className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{request.advertiser_email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.current_name} to {request.requested_name}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">{request.reason}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button size="sm" onClick={() => handleCategoryChangeRequest(request.id, "approved", request)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCategoryChangeRequest(request.id, "rejected", request)}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
            <div>
              <CardTitle className="text-base">Recent campaigns</CardTitle>
              <CardDescription>Latest activity across advertisers.</CardDescription>
            </div>
            <Link to="/admin/advertisers">
              <Button variant="outline" size="sm">
                <TrendingUp className="mr-2 h-4 w-4" />
                View advertisers
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {recentCampaigns.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No campaign activity yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {recentCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    to={`/admin/campaigns/${campaign.id}`}
                    className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_170px_120px_24px] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{campaign.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{campaign.profiles?.email || "Unknown"}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Budget left: ${Number(campaign.budget_remaining || 0).toFixed(2)}
                    </div>
                    <Badge variant="outline" className={`justify-center ${statusColor(campaign.status)}`}>
                      {campaign.status}
                    </Badge>
                    <ArrowRight className="hidden h-4 w-4 text-muted-foreground md:block" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
