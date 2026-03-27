import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Copy, Download, UserPlus, ShoppingCart, Wallet } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Tables<"campaigns"> | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [events, setEvents] = useState<Tables<"events">[]>([]);
  const [stats, setStats] = useState({ downloads: 0, signups: 0, purchases: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const { data: c } = await supabase.from("campaigns").select("*").eq("id", id).single();
      setCampaign(c);
      const { data: keys } = await supabase.from("api_keys").select("key").eq("campaign_id", id).limit(1);
      if (keys && keys.length > 0) setApiKey(keys[0].key);
      const { data: eventsData } = await supabase.from("events").select("*").eq("campaign_id", id).order("created_at", { ascending: false }).limit(50);
      setEvents(eventsData || []);
      const { count: dl } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("campaign_id", id).eq("event_type", "download");
      const { count: su } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("campaign_id", id).eq("event_type", "signup");
      const { count: pu } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("campaign_id", id).eq("event_type", "purchase");
      setStats({ downloads: dl || 0, signups: su || 0, purchases: pu || 0 });
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const copyApiKey = () => { if (apiKey) { navigator.clipboard.writeText(apiKey); toast.success("API key copied!"); } };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></DashboardLayout>;
  if (!campaign) return <DashboardLayout><p className="text-muted-foreground">Campaign not found.</p></DashboardLayout>;

  const totalEvents = stats.downloads + stats.signups + stats.purchases;

  const statCards = [
    { icon: Download, label: "Downloads", value: stats.downloads },
    { icon: UserPlus, label: "Signups", value: stats.signups },
    { icon: ShoppingCart, label: "Purchases", value: stats.purchases },
    { icon: Wallet, label: "Budget Remaining", value: `$${Number(campaign.budget_remaining).toFixed(2)}` },
  ];

  const statusColor = campaign.status === "active" ? "border-primary/30 bg-primary/10 text-primary" :
    campaign.status === "pending" ? "border-warning/30 bg-warning/10 text-warning" :
    "border-destructive/30 bg-destructive/10 text-destructive";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <MotionWrapper>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{campaign.name}</h1>
              <p className="text-muted-foreground text-sm">Campaign ID: {campaign.id}</p>
            </div>
            <Badge variant="outline" className={statusColor}>{campaign.status}</Badge>
          </div>
        </MotionWrapper>

        <MotionWrapper delay={0.1}>
          <GlassCard variant="glow">
            <GlassCardHeader>
              <GlassCardTitle>API Key</GlassCardTitle>
              <GlassCardDescription>Use this key to send events from your application</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              {apiKey ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-muted/50 border border-border/50 px-4 py-2.5 font-mono text-sm text-primary/80">{apiKey}</code>
                  <GlassButton variant="secondary" size="sm" onClick={copyApiKey}><Copy className="h-4 w-4" /></GlassButton>
                </div>
              ) : <p className="text-muted-foreground">API key not generated yet.</p>}
            </GlassCardContent>
          </GlassCard>
        </MotionWrapper>

        <MotionStagger className="grid gap-4 md:grid-cols-4">
          {statCards.map((s) => (
            <MotionItem key={s.label}>
              <GlassCard className="glass-hover">
                <GlassCardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <s.icon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            </MotionItem>
          ))}
        </MotionStagger>

        {totalEvents > 0 && (
          <MotionWrapper delay={0.2}>
            <GlassCard>
              <GlassCardHeader><GlassCardTitle>Conversion Rates</GlassCardTitle></GlassCardHeader>
              <GlassCardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Signup Rate (from downloads)</p>
                    <p className="text-xl font-bold text-foreground">{stats.downloads > 0 ? ((stats.signups / stats.downloads) * 100).toFixed(1) : "0"}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Purchase Rate (from signups)</p>
                    <p className="text-xl font-bold text-foreground">{stats.signups > 0 ? ((stats.purchases / stats.signups) * 100).toFixed(1) : "0"}%</p>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          </MotionWrapper>
        )}

        <MotionWrapper delay={0.25}>
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

        <MotionWrapper delay={0.3}>
          <GlassCard>
            <GlassCardHeader><GlassCardTitle>Recent Events</GlassCardTitle></GlassCardHeader>
            <GlassCardContent>
              {events.length === 0 ? <p className="text-muted-foreground">No events recorded yet.</p> : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between rounded-xl border border-border/50 p-3 transition-colors hover:bg-accent/5">
                      <div>
                        <Badge variant="outline" className="border-primary/20 text-primary/80">{event.event_type}</Badge>
                        <span className="ml-2 text-sm text-muted-foreground">User: {event.external_user_id}</span>
                      </div>
                      <span className="text-xs text-muted-foreground/60">{new Date(event.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        </MotionWrapper>

        <MotionWrapper delay={0.35}>
          <GlassCard>
            <GlassCardHeader><GlassCardTitle>Quick Integration</GlassCardTitle></GlassCardHeader>
            <GlassCardContent>
              <pre className="overflow-x-auto rounded-xl bg-muted/30 border border-border/50 p-4 text-sm text-foreground/70">
{`// Send events to Karbali
fetch("https://advertiser.karbali.com/api/track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    api_key: "${apiKey || "YOUR_API_KEY"}",
    event_type: "signup", // download | signup | purchase
    user_id: "your_user_id",
    referral_id: "referral_code", // from cookie
    amount: null // for purchase events
  })
});`}
              </pre>
            </GlassCardContent>
          </GlassCard>
        </MotionWrapper>
      </div>
    </DashboardLayout>
  );
}
