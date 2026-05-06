import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Plus,
  BarChart3,
  DollarSign,
  MousePointerClick,
  Tag,
  ArrowRight,
  Activity,
  RefreshCw,
  CheckCircle2,
  Clock3,
  Wallet,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Campaign {
  id: string;
  name: string;
  status: string;
  budget_remaining: number;
  created_at: string;
  target_users?: number;
  selected_milestones?: string[];
}

interface DailyData {
  date: string;
  events: number;
}

export default function Dashboard() {
  const { user, categoryStatus, walletActivated } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({ totalEvents: 0, totalSpent: 0, totalClicks: 0 });
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: catData } = await supabase
        .from("advertiser_categories")
        .select("category_id, categories(name)")
        .eq("advertiser_id", user.id)
        .maybeSingle();

      if (catData) setCategoryName((catData as any).categories?.name || null);

      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*")
        .eq("advertiser_id", user.id)
        .order("created_at", { ascending: false });

      const campaignList = (campaignsData as Campaign[]) || [];
      setCampaigns(campaignList);

      if (campaignList.length > 0) {
        const campaignIds = campaignList.map((campaign) => campaign.id);
        const { count: eventsCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .in("campaign_id", campaignIds);
        const { data: txData } = await supabase.from("transactions").select("amount").in("campaign_id", campaignIds);
        const { data: referralData } = await supabase.from("referrals").select("id").in("campaign_id", campaignIds);
        const referralIds = referralData?.map((referral) => referral.id) || [];
        const { count: clicksCount } = referralIds.length > 0
          ? await supabase.from("clicks").select("*", { count: "exact", head: true }).in("referral_id", referralIds)
          : { count: 0 };

        const totalSpent = txData?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) || 0;
        setStats({ totalEvents: eventsCount || 0, totalSpent, totalClicks: clicksCount || 0 });

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: events } = await supabase
          .from("events")
          .select("created_at")
          .in("campaign_id", campaignIds)
          .gte("created_at", thirtyDaysAgo);

        if (events && events.length > 0) {
          const byDay: Record<string, number> = {};
          events.forEach((event) => {
            const day = new Date(event.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            byDay[day] = (byDay[day] || 0) + 1;
          });
          setDailyData(Object.entries(byDay).map(([date, eventsCountByDay]) => ({ date, events: eventsCountByDay })));
        } else {
          setDailyData([]);
        }
      } else {
        setStats({ totalEvents: 0, totalSpent: 0, totalClicks: 0 });
        setDailyData([]);
      }

      setLoading(false);
    };

    void fetchData();
  }, [user?.id]);

  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active").length;
  const pendingCampaigns = campaigns.filter((campaign) => campaign.status === "pending").length;
  const latestCampaigns = campaigns.slice(0, 5);

  const setupItems = useMemo(
    () => [
      {
        label: "Category approved",
        status: categoryStatus === "active",
        hint: categoryStatus === "active" ? "Ready for traffic" : "Waiting for activation",
        icon: CheckCircle2,
      },
      {
        label: "Wallet active",
        status: walletActivated === true,
        hint: walletActivated === true ? "Ready to fund campaigns" : "Activation required",
        icon: Wallet,
      },
      {
        label: "Campaign running",
        status: activeCampaigns > 0,
        hint: activeCampaigns > 0 ? `${activeCampaigns} active campaign${activeCampaigns === 1 ? "" : "s"}` : "No active campaigns yet",
        icon: Activity,
      },
    ],
    [activeCampaigns, categoryStatus, walletActivated],
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "border-primary/20 bg-primary/10 text-primary";
      case "pending":
        return "border-border bg-muted text-muted-foreground";
      case "rejected":
        return "border-destructive/20 bg-destructive/10 text-destructive";
      default:
        return "border-border bg-background text-muted-foreground";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <Card className="border-border shadow-none">
            <CardHeader className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl">Campaign overview</CardTitle>
                <CardDescription>Flat, fast access to your live account performance.</CardDescription>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {categoryName && (
                    <Badge variant="outline" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {categoryName}
                    </Badge>
                  )}
                  <Badge variant="outline">{activeCampaigns} active</Badge>
                  <Badge variant="outline">{pendingCampaigns} pending</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {categoryName && (
                  <Link to="/category-select">
                    <Button variant="outline" size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Change Category
                    </Button>
                  </Link>
                )}
                <Link to="/campaigns/create">
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Campaign
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Events", value: stats.totalEvents.toLocaleString(), icon: Activity, note: "Total tracked actions" },
                  { label: "Clicks", value: stats.totalClicks.toLocaleString(), icon: MousePointerClick, note: "Referral traffic" },
                  { label: "Spend", value: `$${stats.totalSpent.toFixed(2)}`, icon: DollarSign, note: "Total charged" },
                  { label: "Live campaigns", value: String(activeCampaigns), icon: BarChart3, note: "Currently running" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border bg-muted/40 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base">Account readiness</CardTitle>
              <CardDescription>What still needs attention before scaling spend.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {setupItems.map((item) => (
                <div key={item.label} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg ${item.status ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{item.label}</p>
                      <Badge variant="outline" className={item.status ? "border-primary/20 text-primary" : ""}>
                        {item.status ? "Done" : "Pending"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <Card className="border-border shadow-none">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base">Event trend</CardTitle>
              <CardDescription>Last 30 days of tracked activity.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="dashboardEvents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 10,
                        fontSize: 12,
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Area type="monotone" dataKey="events" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#dashboardEvents)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                  No event data yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base">Quick actions</CardTitle>
              <CardDescription>Common tasks without extra clicks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-5">
              {[
                { to: "/campaigns/create", label: "Launch a new campaign", note: "Open the guided setup" },
                { to: "/wallet", label: "Fund your wallet", note: "Top up spend balance" },
                { to: "/ads", label: "Review active ads", note: "Edit or pause creatives" },
                { to: "/docs", label: "Open API docs", note: "Integration and tracking setup" },
              ].map((action) => (
                <Link key={action.to} to={action.to} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/40">
                  <div>
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.note}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>

        <Card className="border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
            <div>
              <CardTitle className="text-base">Recent campaigns</CardTitle>
              <CardDescription>Latest advertiser activity in a simplified list.</CardDescription>
            </div>
            <Badge variant="outline">{campaigns.length} total</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : latestCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Clock3 className="h-10 w-10 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium">No campaigns yet</p>
                  <p className="text-sm text-muted-foreground">Create your first campaign to start tracking results.</p>
                </div>
                <Link to="/campaigns/create">
                  <Button variant="outline" size="sm">Create Campaign</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {latestCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    to={`/campaigns/${campaign.id}`}
                    className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_160px_120px_24px] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{campaign.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Created {new Date(campaign.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Budget left: ${Number(campaign.budget_remaining).toFixed(2)}
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
    </DashboardLayout>
  );
}
