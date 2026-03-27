import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import MotionWrapper from "@/components/MotionWrapper";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(217, 91%, 60%)"];

export default function AdminAnalytics() {
  const [eventBreakdown, setEventBreakdown] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const { count: dl } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("event_type", "download");
      const { count: su } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("event_type", "signup");
      const { count: pu } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("event_type", "purchase");
      setEventBreakdown([
        { name: "Downloads", value: dl || 0 },
        { name: "Signups", value: su || 0 },
        { name: "Purchases", value: pu || 0 },
      ]);
      const { data: campaigns } = await supabase.from("campaigns").select("id, name");
      if (campaigns) {
        const revenuePromises = campaigns.slice(0, 10).map(async (c) => {
          const { data: txs } = await supabase.from("transactions").select("amount").eq("campaign_id", c.id);
          const total = txs?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          return { name: c.name.slice(0, 20), revenue: total };
        });
        setRevenueData((await Promise.all(revenuePromises)).filter(r => r.revenue > 0));
      }
      setLoading(false);
    };
    fetchAnalytics();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <MotionWrapper>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
            <p className="text-muted-foreground">Platform-wide performance metrics</p>
          </div>
        </MotionWrapper>

        <div className="grid gap-6 lg:grid-cols-2">
          <MotionWrapper delay={0.1}>
            <GlassCard variant="strong" className="h-full">
              <GlassCardHeader><GlassCardTitle>Event Breakdown</GlassCardTitle></GlassCardHeader>
              <GlassCardContent>
                {loading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={eventBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {eventBreakdown.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </GlassCardContent>
            </GlassCard>
          </MotionWrapper>

          <MotionWrapper delay={0.2}>
            <GlassCard variant="strong" className="h-full">
              <GlassCardHeader><GlassCardTitle>Revenue by Campaign</GlassCardTitle></GlassCardHeader>
              <GlassCardContent>
                {loading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div> : revenueData.length === 0 ? (
                  <p className="text-muted-foreground">No revenue data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" }} />
                      <Bar dataKey="revenue" fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </GlassCardContent>
            </GlassCard>
          </MotionWrapper>
        </div>
      </div>
    </DashboardLayout>
  );
}
