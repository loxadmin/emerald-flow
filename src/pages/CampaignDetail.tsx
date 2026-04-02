import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Copy, Download, UserPlus, ShoppingCart, Wallet, Users } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DailyData { date: string; downloads: number; signups: number; purchases: number; }

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Tables<"campaigns"> & { target_users?: number; selected_milestones?: string[]; total_cost?: number; integration_verified?: boolean; integration_type?: string } | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [stats, setStats] = useState({ downloads: 0, signups: 0, purchases: 0 });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const { data: c } = await supabase.from("campaigns").select("*").eq("id", id).single();
      setCampaign(c as any);
      const { data: keys } = await supabase.from("api_keys").select("key").eq("campaign_id", id).limit(1);
      if (keys && keys.length > 0) setApiKey(keys[0].key);

      const { count: dl } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("campaign_id", id).eq("event_type", "download");
      const { count: su } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("campaign_id", id).eq("event_type", "signup");
      const { count: pu } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("campaign_id", id).eq("event_type", "purchase");
      setStats({ downloads: dl || 0, signups: su || 0, purchases: pu || 0 });

      // Fetch events for chart (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: events } = await supabase.from("events").select("event_type, created_at").eq("campaign_id", id).gte("created_at", thirtyDaysAgo).order("created_at");

      if (events && events.length > 0) {
        const byDay: Record<string, DailyData> = {};
        events.forEach((e) => {
          const day = new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (!byDay[day]) byDay[day] = { date: day, downloads: 0, signups: 0, purchases: 0 };
          if (e.event_type === "download") byDay[day].downloads++;
          else if (e.event_type === "signup") byDay[day].signups++;
          else if (e.event_type === "purchase") byDay[day].purchases++;
        });
        setDailyData(Object.values(byDay));
      }

      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></DashboardLayout>;
  if (!campaign) return <DashboardLayout><p className="text-muted-foreground">Campaign not found.</p></DashboardLayout>;

  const statusColor = campaign.status === "active" ? "border-primary/30 bg-primary/10 text-primary" :
    campaign.status === "pending" ? "border-warning/30 bg-warning/10 text-warning" :
    "border-destructive/30 bg-destructive/10 text-destructive";

  const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <MotionWrapper>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{campaign.name}</h1>
              <p className="text-muted-foreground text-sm">Campaign ID: {campaign.id}</p>
              {(campaign as any).selected_milestones?.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {(campaign as any).selected_milestones.map((m: string) => (
                    <Badge key={m} variant="outline" className="border-primary/20 text-primary/80 text-xs capitalize">{m}</Badge>
                  ))}
                </div>
              )}
            </div>
            <Badge variant="outline" className={statusColor}>{campaign.status}</Badge>
          </div>
        </MotionWrapper>

        <MotionWrapper delay={0.05}>
          <GlassCard variant="glow">
            <GlassCardHeader>
              <GlassCardTitle>API Key</GlassCardTitle>
              <GlassCardDescription>Use this key to send events from your application</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              {apiKey ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-muted/50 border border-border/50 px-4 py-2.5 font-mono text-sm text-primary/80 truncate">{apiKey}</code>
                  <GlassButton variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(apiKey); toast.success("API key copied!"); }}><Copy className="h-4 w-4" /></GlassButton>
                </div>
              ) : <p className="text-muted-foreground">API key not generated yet.</p>}
            </GlassCardContent>
          </GlassCard>
        </MotionWrapper>

        <MotionStagger className="grid gap-4 grid-cols-2 md:grid-cols-5">
          {[
            { icon: Download, label: "Downloads", value: stats.downloads },
            { icon: UserPlus, label: "Signups", value: stats.signups },
            { icon: ShoppingCart, label: "Purchases", value: stats.purchases },
            { icon: Wallet, label: "Budget Left", value: `$${Number(campaign.budget_remaining).toFixed(2)}` },
            { icon: Users, label: "Target", value: (campaign as any).target_users || "—" },
          ].map((s) => (
            <MotionItem key={s.label}>
              <GlassCard className="glass-hover">
                <GlassCardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <s.icon className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            </MotionItem>
          ))}
        </MotionStagger>

        {/* Analytics Chart */}
        {dailyData.length > 0 && (
          <MotionWrapper delay={0.15}>
            <GlassCard variant="strong">
              <GlassCardHeader><GlassCardTitle>Performance (Last 30 Days)</GlassCardTitle></GlassCardHeader>
              <GlassCardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorDl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="downloads" stroke="hsl(217, 91%, 60%)" fillOpacity={1} fill="url(#colorDl)" />
                    <Area type="monotone" dataKey="signups" stroke="hsl(160, 84%, 39%)" fillOpacity={1} fill="url(#colorSu)" />
                    <Area type="monotone" dataKey="purchases" stroke="hsl(38, 92%, 50%)" fillOpacity={1} fill="url(#colorPu)" />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCardContent>
            </GlassCard>
          </MotionWrapper>
        )}

        <MotionWrapper delay={0.2}>
          <GlassCard>
            <GlassCardHeader><GlassCardTitle>Pricing</GlassCardTitle></GlassCardHeader>
            <GlassCardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Download", value: campaign.price_download },
                  { label: "Signup", value: campaign.price_signup },
                  { label: "Purchase", value: campaign.price_purchase },
                ].map((p) => (
                  <div key={p.label} className="rounded-xl border border-border/50 bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">{p.label}</p>
                    <p className="text-xl font-bold text-foreground">${Number(p.value).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>
        </MotionWrapper>
      </div>
    </DashboardLayout>
  );
}
