import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { Plus, BarChart3, DollarSign, MousePointerClick, Tag, TrendingUp, TrendingDown, ArrowRight, Activity, RefreshCw } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Campaign { id: string; name: string; status: string; budget_remaining: number; created_at: string; target_users?: number; selected_milestones?: string[]; }
interface DailyData { date: string; events: number; }

export default function Dashboard() {
  const { user, categoryStatus } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({ totalEvents: 0, totalSpent: 0, totalClicks: 0 });
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: catData } = await supabase
        .from("advertiser_categories")
        .select("category_id, categories(name)")
        .eq("advertiser_id", user.id)
        .maybeSingle();
      if (catData) setCategoryName((catData as any).categories?.name || null);

      const { data: campaignsData } = await supabase.from("campaigns").select("*").eq("advertiser_id", user.id).order("created_at", { ascending: false });
      setCampaigns((campaignsData as Campaign[]) || []);
      if (campaignsData && campaignsData.length > 0) {
        const campaignIds = campaignsData.map((c: Campaign) => c.id);
        const { count: eventsCount } = await supabase.from("events").select("*", { count: "exact", head: true }).in("campaign_id", campaignIds);
        const { data: txData } = await supabase.from("transactions").select("amount").in("campaign_id", campaignIds);
        const { data: referralData } = await supabase.from("referrals").select("id").in("campaign_id", campaignIds);
        const referralIds = referralData?.map((referral) => referral.id) || [];
        const { count: clicksCount } = referralIds.length > 0
          ? await supabase.from("clicks").select("*", { count: "exact", head: true }).in("referral_id", referralIds)
          : { count: 0 };
        const totalSpent = txData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        setStats({ totalEvents: eventsCount || 0, totalSpent, totalClicks: clicksCount || 0 });

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: events } = await supabase.from("events").select("created_at").in("campaign_id", campaignIds).gte("created_at", thirtyDaysAgo);
        if (events && events.length > 0) {
          const byDay: Record<string, number> = {};
          events.forEach((e) => {
            const day = new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            byDay[day] = (byDay[day] || 0) + 1;
          });
          setDailyData(Object.entries(byDay).map(([date, events]) => ({ date, events })));
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-primary/10 text-primary border-primary/20";
      case "pending": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "";
    }
  };

  const activeCampaigns = campaigns.filter(c => c.status === "active").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <MotionWrapper>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">Campaign performance & analytics</p>
                {categoryName && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-normal">
                      <Tag className="h-3 w-3 mr-1" />{categoryName}
                    </Badge>
                    <Link to="/category-select">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground">
                        <RefreshCw className="h-3 w-3 mr-1" /> Change
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <Link to="/campaigns/create">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />New Campaign
              </Button>
            </Link>
          </div>
        </MotionWrapper>

        {/* Stats Cards */}
        <MotionStagger className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Events", value: stats.totalEvents.toLocaleString(), icon: Activity, trend: "+12%", up: true },
            { label: "Total Clicks", value: stats.totalClicks.toLocaleString(), icon: MousePointerClick, trend: null, up: true },
            { label: "Total Spent", value: `$${stats.totalSpent.toFixed(2)}`, icon: DollarSign, trend: null, up: false },
            { label: "Active Campaigns", value: activeCampaigns, icon: BarChart3, trend: null, up: true },
          ].map((s) => (
            <MotionItem key={s.label}>
              <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <s.icon className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-semibold text-foreground">{s.value}</span>
                  {s.trend && (
                    <span className={`flex items-center text-xs font-medium mb-0.5 ${s.up ? "text-primary" : "text-destructive"}`}>
                      {s.up ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                      {s.trend}
                    </span>
                  )}
                </div>
              </div>
            </MotionItem>
          ))}
        </MotionStagger>

        {/* Analytics Chart */}
        <MotionWrapper delay={0.1}>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">Performance</h3>
                <p className="text-xs text-muted-foreground">Events over the last 30 days</p>
              </div>
              <Badge variant="outline" className="text-xs font-normal">Last 30 days</Badge>
            </div>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Area type="monotone" dataKey="events" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p>No event data yet</p>
                  <p className="text-xs mt-1">Events will appear here once campaigns are active</p>
                </div>
              </div>
            )}
          </div>
        </MotionWrapper>

        {/* Campaigns List */}
        <MotionWrapper delay={0.15}>
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="text-sm font-medium text-foreground">Campaigns</h3>
              <span className="text-xs text-muted-foreground">{campaigns.length} total</span>
            </div>
            <div className="px-5 pb-5">
              {loading ? (
                <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              ) : campaigns.length === 0 ? (
                <div className="py-10 text-center">
                  <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground mb-3">No campaigns yet</p>
                  <Link to="/campaigns/create">
                    <Button variant="outline" size="sm">Create your first campaign</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {campaigns.map((campaign) => (
                    <Link key={campaign.id} to={`/campaigns/${campaign.id}`} className="flex items-center justify-between gap-3 py-3.5 group">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{campaign.name}</p>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor(campaign.status)}`}>{campaign.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Budget: ${Number(campaign.budget_remaining).toFixed(2)}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </MotionWrapper>
      </div>
    </DashboardLayout>
  );
}
