import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import {
  Plus, BarChart3, DollarSign, MousePointerClick, Tag, ArrowUpRight,
  Activity, RefreshCw, Sparkles, Gift,

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

export default function Dashboard() {
  const { user } = useAuth();
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
      if (catData) setCategoryName((catData as { categories?: { name?: string } | null })?.categories?.name || null);

      const { data: campaignsData } = await supabase
        .from("campaigns").select("*").eq("advertiser_id", user.id)
        .order("created_at", { ascending: false });
      setCampaigns((campaignsData as Campaign[]) || []);
      if (campaignsData && campaignsData.length > 0) {
        const campaignIds = campaignsData.map((c: Campaign) => c.id);
        const { count: eventsCount } = await supabase
          .from("events").select("*", { count: "exact", head: true }).in("campaign_id", campaignIds);
        const { data: txData } = await supabase
          .from("transactions").select("amount").in("campaign_id", campaignIds);
        const { data: referralData } = await supabase
          .from("referrals").select("id").in("campaign_id", campaignIds);
        const referralIds = referralData?.map((r) => r.id) || [];
        const { count: clicksCount } = referralIds.length > 0
          ? await supabase.from("clicks").select("*", { count: "exact", head: true }).in("referral_id", referralIds)
          : { count: 0 };
        const totalSpent = txData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        setStats({ totalEvents: eventsCount || 0, totalSpent, totalClicks: clicksCount || 0 });

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: events } = await supabase
          .from("events").select("created_at").in("campaign_id", campaignIds).gte("created_at", thirtyDaysAgo);
        if (events && events.length > 0) {
          const byDay: Record<string, number> = {};
          events.forEach((e) => {
            const day = new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            byDay[day] = (byDay[day] || 0) + 1;
          });
          setDailyData(Object.entries(byDay).map(([date, ev]) => ({ date, events: ev })));
        }
      }
      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const firstName = user?.email?.split("@")[0] || "there";

  const statusClass = (s: string) => STATUS_STYLES[s] || "bg-muted text-muted-foreground border-border";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <MotionWrapper>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="eyebrow">Overview</p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Welcome back, <span className="text-foreground">{firstName}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Live performance across your workspace.</span>
                {categoryName && (
                  <>
                    <span className="text-border">·</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      {categoryName}
                    </span>
                    <Link
                      to="/category-select"
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" /> change
                    </Link>
                  </>
                )}
              </div>
            </div>
            <Link to="/campaigns/create" className="self-start sm:self-auto">
              <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                <Plus className="h-4 w-4" /> New campaign
              </Button>
            </Link>
          </div>
        </MotionWrapper>

        {/* Stats */}
        <MotionStagger className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Events", value: stats.totalEvents.toLocaleString(), icon: Activity, hint: "Total events tracked" },
            { label: "Clicks", value: stats.totalClicks.toLocaleString(), icon: MousePointerClick, hint: "Verified clicks" },
            { label: "Spent", value: `$${stats.totalSpent.toFixed(2)}`, icon: DollarSign, hint: "Across all campaigns" },
            { label: "Active", value: activeCampaigns.toString(), icon: BarChart3, hint: "Live campaigns" },
          ].map((s) => (
            <MotionItem key={s.label}>
              <div className="group relative h-full rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/15">
                <div className="flex items-start justify-between mb-4">
                  <span className="eyebrow">{s.label}</span>
                  <s.icon className="h-3.5 w-3.5 text-muted-foreground/70" />
                </div>
                <p className="stat-number">{s.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{s.hint}</p>
              </div>
            </MotionItem>
          ))}
        </MotionStagger>

        {/* Performance chart */}
        <MotionWrapper delay={0.1}>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
              <div>
                <p className="eyebrow mb-1">Performance</p>
                <h3 className="text-base font-semibold tracking-tight">Events trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Last 30 days · all campaigns</p>
              </div>
              <Badge variant="outline" className="text-[11px] font-normal border-border bg-secondary/50">
                30D
              </Badge>
            </div>
            <div className="px-2 sm:px-4 pb-4">
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={dailyData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.5} />
                    <XAxis
                      dataKey="date" axisLine={false} tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false} tickLine={false} width={32}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                        color: "hsl(var(--foreground))",
                        boxShadow: "var(--shadow-md)",
                        padding: "8px 10px",
                      }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}
                    />
                    <Area
                      type="monotone" dataKey="events"
                      stroke="hsl(var(--primary))" strokeWidth={1.75}
                      fillOpacity={1} fill="url(#colorEvents)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[240px]">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No event data yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Events will appear once campaigns go live</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </MotionWrapper>

        {/* Campaigns */}
        <MotionWrapper delay={0.15}>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <p className="eyebrow mb-0.5">Campaigns</p>
                <h3 className="text-base font-semibold tracking-tight">Recent activity</h3>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{campaigns.length} total</span>
            </div>
            <div>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : campaigns.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No campaigns yet</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-5">
                    Launch your first campaign to start reaching real customers.
                  </p>
                  <Link to="/campaigns/create">
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Create campaign
                    </Button>
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {campaigns.slice(0, 8).map((campaign) => (
                    <li key={campaign.id}>
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="flex items-center justify-between gap-3 px-6 py-4 group hover:bg-accent/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {campaign.name}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 font-medium uppercase tracking-wider ${statusClass(campaign.status)}`}
                            >
                              {campaign.status}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                            Budget remaining: <span className="font-mono">${Number(campaign.budget_remaining).toFixed(2)}</span>
                          </p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </MotionWrapper>
      </div>
    </DashboardLayout>
  );
}
