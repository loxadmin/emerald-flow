import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Copy, Download, MousePointerClick, UserPlus, ShoppingCart, Wallet, Users, Eye, EyeOff } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface DailyData { date: string; downloads: number; signups: number; purchases: number; }

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<(Tables<"campaigns"> & { target_users?: number; selected_milestones?: string[]; total_cost?: number; integration_verified?: boolean; integration_type?: string }) | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [stats, setStats] = useState({ clicks: 0, downloads: 0, signups: 0, purchases: 0 });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackerStatus, setTrackerStatus] = useState<any>(null);
  const [trackerSnippet, setTrackerSnippet] = useState<string>("");
  const [regenerating, setRegenerating] = useState(false);

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
      const { data: campaignReferrals } = await supabase.from("referrals").select("id").eq("campaign_id", id);
      const referralIds = campaignReferrals?.map((referral) => referral.id) || [];
      const { count: clickCount } = referralIds.length > 0
        ? await supabase.from("clicks").select("*", { count: "exact", head: true }).in("referral_id", referralIds)
        : { count: 0 };
      setStats({ clicks: clickCount || 0, downloads: dl || 0, signups: su || 0, purchases: pu || 0 });
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

      const { data: authData } = await supabase.auth.getSession();
      const accessToken = authData.session?.access_token;
      if (accessToken) {
        const [statusRes, snippetRes] = await Promise.all([
          fetch(`/api/campaign/${id}/tracker/status`, { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch(`/api/campaign/${id}/tracker/snippet`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        ]);
        if (statusRes.ok) setTrackerStatus(await statusRes.json());
        if (snippetRes.ok) {
          const payload = await snippetRes.json();
          setTrackerSnippet(payload.snippet || "");
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleRegenerateScript = async () => {
    if (!id) return;
    setRegenerating(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const accessToken = authData.session?.access_token;
      if (!accessToken) throw new Error("Missing auth session");

      const response = await fetch(`/api/campaign/${id}/tracker/regenerate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Regeneration failed");
      toast.success("Script regenerated to latest stable tracker release");
      setTrackerSnippet(payload.snippet || "");

      const statusRes = await fetch(`/api/campaign/${id}/tracker/status`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (statusRes.ok) setTrackerStatus(await statusRes.json());
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate script");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center py-20"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></DashboardLayout>;
  if (!campaign) return <DashboardLayout><p className="text-muted-foreground">Campaign not found.</p></DashboardLayout>;

  const statusColor = campaign.status === "active" ? "text-primary border-primary/20 bg-primary/5" :
    campaign.status === "pending" ? "text-amber-600 border-amber-500/20 bg-amber-500/5" :
    "text-destructive border-destructive/20 bg-destructive/5";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <MotionWrapper>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">{campaign.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">ID: {campaign.id.slice(0, 8)}…</p>
              {(campaign as any).selected_milestones?.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {(campaign as any).selected_milestones.map((m: string) => (
                    <Badge key={m} variant="outline" className="text-[10px] capitalize">{m}</Badge>
                  ))}
                </div>
              )}
            </div>
            <Badge variant="outline" className={statusColor}>{campaign.status}</Badge>
          </div>
        </MotionWrapper>

        {/* API Key */}
        <MotionWrapper delay={0.05}>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-2">API Key</h3>
            {apiKey ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-muted px-3 py-2 font-mono text-sm text-primary truncate">
                  {showKey ? apiKey : "•".repeat(Math.min(apiKey.length, 40))}
                </code>
                <Button variant="outline" size="sm" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(apiKey); toast.success("Copied!"); }}><Copy className="h-4 w-4" /></Button>
              </div>
            ) : <p className="text-sm text-muted-foreground">Not generated yet.</p>}
          </div>
        </MotionWrapper>

        <MotionWrapper delay={0.08}>
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-foreground">Tracker Script Lifecycle</h3>
                <p className="text-xs text-muted-foreground">Regenerate script to latest stable release without recreating this campaign.</p>
              </div>
              <Button onClick={handleRegenerateScript} disabled={regenerating || !id}>
                {regenerating ? "Regenerating..." : "Regenerate Script"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">Current: {trackerStatus?.current_version || "legacy"}</Badge>
              <Badge variant="outline">Latest stable: {trackerStatus?.latest_stable_version || "unknown"}</Badge>
              <Badge variant="outline" className="capitalize">{trackerStatus?.upgrade_badge || "up-to-date"}</Badge>
            </div>
            {trackerSnippet && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Latest generated snippet</p>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground/70 whitespace-pre-wrap">{trackerSnippet}</pre>
              </div>
            )}
          </div>
        </MotionWrapper>

        {/* Stats */}
        <MotionStagger className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {[
            { icon: MousePointerClick, label: "Clicks", value: stats.clicks },
            { icon: Download, label: "Downloads", value: stats.downloads },
            { icon: UserPlus, label: "Signups", value: stats.signups },
            { icon: ShoppingCart, label: "Purchases", value: stats.purchases },
            { icon: Wallet, label: "Budget Left", value: `$${Number(campaign.budget_remaining).toFixed(2)}` },
            { icon: Users, label: "Target", value: (campaign as any).target_users || "—" },
          ].map((s) => (
            <MotionItem key={s.label}>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="h-4 w-4 text-muted-foreground/60" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-lg font-semibold text-foreground">{s.value}</p>
              </div>
            </MotionItem>
          ))}
        </MotionStagger>

        {/* Chart */}
        {dailyData.length > 0 && (
          <MotionWrapper delay={0.1}>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Performance (Last 30 Days)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="cDl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.15} /><stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} /></linearGradient>
                    <linearGradient id="cSu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
                    <linearGradient id="cPu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.15} /><stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} /></linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12, color: "hsl(var(--foreground))" }} />
                  <Area type="monotone" dataKey="downloads" stroke="hsl(217, 91%, 60%)" strokeWidth={1.5} fillOpacity={1} fill="url(#cDl)" />
                  <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" strokeWidth={1.5} fillOpacity={1} fill="url(#cSu)" />
                  <Area type="monotone" dataKey="purchases" stroke="hsl(38, 92%, 50%)" strokeWidth={1.5} fillOpacity={1} fill="url(#cPu)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </MotionWrapper>
        )}

        {/* Pricing */}
        <MotionWrapper delay={0.15}>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-3">Pricing</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: "Download", value: campaign.price_download },
                { label: "Signup", value: campaign.price_signup },
                { label: "Purchase", value: campaign.price_purchase },
              ].map((p) => (
                <div key={p.label} className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                  <p className="text-lg font-semibold text-foreground">${Number(p.value).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </MotionWrapper>
      </div>
    </DashboardLayout>
  );
}
