import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(217, 91%, 60%)"];

export default function AdminAnalytics() {
  const [eventBreakdown, setEventBreakdown] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Event breakdown
      const { count: dl } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("event_type", "download");
      const { count: su } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("event_type", "signup");
      const { count: pu } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("event_type", "purchase");
      
      setEventBreakdown([
        { name: "Downloads", value: dl || 0 },
        { name: "Signups", value: su || 0 },
        { name: "Purchases", value: pu || 0 },
      ]);

      // Revenue by campaign
      const { data: campaigns } = await supabase.from("campaigns").select("id, name");
      if (campaigns) {
        const revenuePromises = campaigns.slice(0, 10).map(async (c) => {
          const { data: txs } = await supabase.from("transactions").select("amount").eq("campaign_id", c.id);
          const total = txs?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          return { name: c.name.slice(0, 20), revenue: total };
        });
        const revenue = await Promise.all(revenuePromises);
        setRevenueData(revenue.filter(r => r.revenue > 0));
      }
      setLoading(false);
    };
    fetchAnalytics();
  }, []);

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Platform-wide performance metrics</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Event Breakdown</CardTitle></CardHeader>
            <CardContent>
              {loading ? <p className="text-muted-foreground">Loading...</p> : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={eventBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {eventBreakdown.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Revenue by Campaign</CardTitle></CardHeader>
            <CardContent>
              {loading ? <p className="text-muted-foreground">Loading...</p> : revenueData.length === 0 ? (
                <p className="text-muted-foreground">No revenue data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
