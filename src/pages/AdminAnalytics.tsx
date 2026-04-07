import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import MotionWrapper from "@/components/MotionWrapper";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line } from "recharts";

const COLORS = ["hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(217, 91%, 60%)", "hsl(0, 72%, 50%)"];
const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: 12 };

interface EventBreakdown { name: string; value: number; }
interface RevenueData { name: string; revenue: number; }
interface DailyTrend { date: string; downloads: number; signups: number; purchases: number; }
interface ClickTrend { date: string; clicks: number; }

export default function AdminAnalytics() {
  const [eventBreakdown, setEventBreakdown] = useState<EventBreakdown[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [clickTrend, setClickTrend] = useState<ClickTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const [dlRes, suRes, puRes] = await Promise.all([
        supabase.from("events").select("*", { count: "exact", head: true }).eq("event_type", "download"),
        supabase.from("events").select("*", { count: "exact", head: true }).eq("event_type", "signup"),
        supabase.from("events").select("*", { count: "exact", head: true }).eq("event_type", "purchase"),
      ]);
      setEventBreakdown([
        { name: "Downloads", value: dlRes.count || 0 },
        { name: "Signups", value: suRes.count || 0 },
        { name: "Purchases", value: puRes.count || 0 },
      ]);

      // Revenue by campaign
      const { data: campaigns } = await supabase.from("campaigns").select("id, name");
      if (campaigns) {
        const revenuePromises = campaigns.slice(0, 10).map(async (c) => {
          const { data: txs } = await supabase.from("transactions").select("amount").eq("campaign_id", c.id);
          return { name: c.name.slice(0, 15), revenue: txs?.reduce((sum, t) => sum + Number(t.amount), 0) || 0 };
        });
        setRevenueData((await Promise.all(revenuePromises)).filter(r => r.revenue > 0));
      }

      // 30-day event breakdown trend
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: allEvents }, { data: allClicks }] = await Promise.all([
        supabase.from("events").select("event_type, created_at").gte("created_at", thirtyDaysAgo),
        supabase.from("clicks").select("created_at").gte("created_at", thirtyDaysAgo),
      ]);

      const trendMap: Record<string, DailyTrend> = {};
      const clickMap: Record<string, number> = {};
      allEvents?.forEach(e => {
        const day = new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (!trendMap[day]) trendMap[day] = { date: day, downloads: 0, signups: 0, purchases: 0 };
        if (e.event_type === "download") trendMap[day].downloads++;
        else if (e.event_type === "signup") trendMap[day].signups++;
        else if (e.event_type === "purchase") trendMap[day].purchases++;
      });
      allClicks?.forEach(c => {
        const day = new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        clickMap[day] = (clickMap[day] || 0) + 1;
      });

      setDailyTrend(Object.values(trendMap));
      setClickTrend(Object.entries(clickMap).map(([date, clicks]) => ({ date, clicks })));
      setLoading(false);
    };
    fetchAnalytics();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <MotionWrapper>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground">Platform-wide performance metrics</p>
          </div>
        </MotionWrapper>

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <>
            {/* Row 1: Event Breakdown + Revenue */}
            <div className="grid gap-4 lg:grid-cols-2">
              <MotionWrapper delay={0.05}>
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-medium text-foreground mb-4">Event Breakdown</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={eventBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={3} label={{ fontSize: 11 }}>
                        {eventBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </MotionWrapper>

              <MotionWrapper delay={0.1}>
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-medium text-foreground mb-4">Revenue by Campaign</h3>
                  {revenueData.length === 0 ? (
                    <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">No revenue data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="revenue" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </MotionWrapper>
            </div>

            {/* Row 2: Event Trend + Click Trend */}
            <div className="grid gap-4 lg:grid-cols-2">
              <MotionWrapper delay={0.15}>
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-medium text-foreground mb-4">Event Trend (30 Days)</h3>
                  {dailyTrend.length === 0 ? (
                    <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">No event data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={dailyTrend}>
                        <defs>
                          <linearGradient id="gDl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.15} /><stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} /></linearGradient>
                          <linearGradient id="gSu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.15} /><stop offset="95%" stopColor={COLORS[1]} stopOpacity={0} /></linearGradient>
                          <linearGradient id="gPu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[2]} stopOpacity={0.15} /><stop offset="95%" stopColor={COLORS[2]} stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area type="monotone" dataKey="downloads" stroke={COLORS[0]} strokeWidth={1.5} fillOpacity={1} fill="url(#gDl)" name="Downloads" />
                        <Area type="monotone" dataKey="signups" stroke={COLORS[1]} strokeWidth={1.5} fillOpacity={1} fill="url(#gSu)" name="Signups" />
                        <Area type="monotone" dataKey="purchases" stroke={COLORS[2]} strokeWidth={1.5} fillOpacity={1} fill="url(#gPu)" name="Purchases" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </MotionWrapper>

              <MotionWrapper delay={0.2}>
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-medium text-foreground mb-4">Click Trend (30 Days)</h3>
                  {clickTrend.length === 0 ? (
                    <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">No click data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={clickTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="clicks" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} name="Clicks" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </MotionWrapper>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
