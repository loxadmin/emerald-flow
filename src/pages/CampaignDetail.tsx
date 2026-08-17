import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Copy, Download, MousePointerClick, UserPlus, ShoppingCart, Wallet, Users, Eye, EyeOff, RefreshCw, KeyRound, Music, MonitorPlay, HelpCircle, CheckCircle2, MessageSquareWarning, Plus, StopCircle, AlertTriangle } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import PendingCountdown from "@/components/PendingCountdown";
import MigrationChart from "@/components/MigrationChart";
import { friendlyError } from "@/lib/errors";

interface DailyData {
  date: string;
  ts: number;
  downloads: number;
  signups: number;
  purchases: number;
  interactions: number;
  correct: number;
  revenue: number;
}

const SUPABASE_URL = "https://dvkoafztquswcqniwcyf.supabase.co";

const edgeFnUrl = (fnName: string, subPath?: string) =>
  `${SUPABASE_URL}/functions/v1/${fnName}${subPath ? subPath : ""}`;

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [requestQuestion, setRequestQuestion] = useState<any>(null);
  const [requestReason, setRequestReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [campaign, setCampaign] = useState<(Tables<"campaigns"> & { target_users?: number; selected_milestones?: string[]; total_cost?: number; integration_verified?: boolean; integration_type?: string; campaign_mode?: string; platform_type?: string; app_link?: string }) | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [stats, setStats] = useState({ clicks: 0, downloads: 0, signups: 0, purchases: 0 });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackerStatus, setTrackerStatus] = useState<any>(null);
  const [trackerSnippet, setTrackerSnippet] = useState<string>("");
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);
  const [creative, setCreative] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [engagementStats, setEngagementStats] = useState({ interactions: 0, correct: 0, points: 0 });
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [endLoading, setEndLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  const refreshWallet = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from("wallets").select("balance").eq("advertiser_id", user.id).maybeSingle();
    if (data) setWalletBalance(Number(data.balance));
  };

  useEffect(() => { refreshWallet(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const handleTopupEscrow = async () => {
    if (!id) return;
    const amt = Number(topupAmount);
    if (!Number.isFinite(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > walletBalance) { toast.error("Insufficient wallet balance"); return; }
    setTopupLoading(true);
    const { data, error } = await supabase.rpc("topup_campaign_escrow" as any, { _campaign_id: id, _amount: amt });
    setTopupLoading(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("Escrow topped up");
    setTopupOpen(false);
    setTopupAmount("");
    const result: any = data;
    setCampaign((c) => c ? ({ ...c, budget_remaining: result?.new_escrow ?? c.budget_remaining, status: c.status === "paused" ? "active" : c.status } as any) : c);
    refreshWallet();
  };

  const handleEndCampaign = async () => {
    if (!id) return;
    if (!confirm("End this campaign now? Any unused escrow will be refunded to your wallet.")) return;
    setEndLoading(true);
    const { data, error } = await supabase.rpc("end_campaign_early" as any, { _campaign_id: id });
    setEndLoading(false);
    if (error) { toast.error(friendlyError(error)); return; }
    const result: any = data;
    toast.success(`Campaign ended. $${Number(result?.refunded || 0).toFixed(2)} refunded to wallet.`);
    setCampaign((c) => c ? ({ ...c, status: "ended", budget_remaining: 0 } as any) : c);
    refreshWallet();
  };

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const fetchTrackerInfo = async (campaignId: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const headers = {
        Authorization: `Bearer ${token}`,
        apikey: supabase["supabaseKey"] || "",
      };

      const [statusRes, snippetRes] = await Promise.all([
        fetch(edgeFnUrl("tracker-management", `/api/campaign/${campaignId}/tracker/status`), { headers }),
        fetch(edgeFnUrl("tracker-management", `/api/campaign/${campaignId}/tracker/snippet`), { headers }),
      ]);
      if (statusRes.ok) setTrackerStatus(await statusRes.json());
      if (snippetRes.ok) {
        const payload = await snippetRes.json();
        setTrackerSnippet(payload.snippet || "");
      }
    } catch (err) {
      console.warn("Tracker info fetch failed:", err);
    }
  };

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const { data: c } = await supabase.from("campaigns").select("*").eq("id", id).single();
        setCampaign(c as any);
        const isEngagement = (c as any)?.ad_type === "engagement";
        const isManualMode = (c as any)?.campaign_mode === "manual";

        if (!isEngagement && !isManualMode) {
          const { data: keys } = await supabase.from("api_keys").select("key").eq("campaign_id", id).order("created_at", { ascending: false }).limit(1);
          if (keys && keys.length > 0) setApiKey(keys[0].key);
        }

        const { data: campaignReferrals } = await supabase.from("referrals").select("id").eq("campaign_id", id);
        const referralIds = campaignReferrals?.map((r) => r.id) || [];
        const { count: clickCount } = referralIds.length > 0
          ? await supabase.from("clicks").select("*", { count: "exact", head: true }).in("referral_id", referralIds)
          : { count: 0 };

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const [{ data: chartEvents }, { data: chartManual }, { data: chartInteractions }] = await Promise.all([
          supabase.from("events").select("event_type, amount, created_at").eq("campaign_id", id).gte("created_at", thirtyDaysAgo),
          supabase.from("manual_events" as any).select("event_type, count, purchase_amount, created_at").eq("campaign_id", id).gte("created_at", thirtyDaysAgo),
          supabase.from("offerwall_interactions" as any).select("is_correct, points_earned, created_at").eq("campaign_id", id).gte("created_at", thirtyDaysAgo),
        ]);

        const byDay: Record<string, DailyData> = {};
        const ensureDay = (createdAt: string) => {
          const d = new Date(createdAt);
          const key = d.toISOString().slice(0, 10);
          if (!byDay[key]) {
            byDay[key] = {
              date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              ts: new Date(key).getTime(),
              downloads: 0,
              signups: 0,
              purchases: 0,
              interactions: 0,
              correct: 0,
              revenue: 0,
            };
          }
          return byDay[key];
        };

        (chartEvents || []).forEach((event: any) => {
          const row = ensureDay(event.created_at);
          if (event.event_type === "download") row.downloads += 1;
          else if (event.event_type === "signup") row.signups += 1;
          else if (event.event_type === "purchase") {
            row.purchases += 1;
            row.revenue += Number(event.amount || 0);
          }
        });

        (chartManual || []).forEach((manual: any) => {
          const row = ensureDay(manual.created_at);
          const count = Number(manual.count || 0);
          if (manual.event_type === "download") row.downloads += count;
          else if (manual.event_type === "signup") row.signups += count;
          else if (manual.event_type === "purchase") {
            row.purchases += count;
            row.revenue += Number(manual.purchase_amount || 0);
          } else if (manual.event_type === "interaction" || manual.event_type === "engagement_interaction") {
            row.interactions += count;
          }
        });

        (chartInteractions || []).forEach((interaction: any) => {
          const row = ensureDay(interaction.created_at);
          row.interactions += 1;
          if (interaction.is_correct) row.correct += 1;
        });

        setDailyData(Object.values(byDay).sort((a, b) => a.ts - b.ts));

        if (isEngagement) {
          const [{ data: cc }, { data: qs }, { data: interactions }] = await Promise.all([
            supabase.from("creative_campaigns" as any).select("*").eq("campaign_id", id).maybeSingle(),
            supabase.from("campaign_questions").select("*").eq("campaign_id", id).order("created_at"),
            supabase.from("offerwall_interactions").select("is_correct, points_earned").eq("campaign_id", id),
          ]);
          setCreative(cc);
          setQuestions(qs || []);
          const interactionRows = interactions || [];
          const manualInteractionTotal = (chartManual || []).reduce((sum: number, manual: any) => {
            if (manual.event_type === "interaction" || manual.event_type === "engagement_interaction") {
              return sum + Number(manual.count || 0);
            }
            return sum;
          }, 0);
          const correct = interactionRows.filter((i: any) => i.is_correct).length;
          const points = interactionRows.reduce((s: number, i: any) => s + Number(i.points_earned || 0), 0);
          setEngagementStats({ interactions: interactionRows.length + manualInteractionTotal, correct, points });
          setStats({ clicks: clickCount || 0, downloads: 0, signups: 0, purchases: 0 });
        } else {
          const eventTotals = (chartEvents || []).reduce((acc, event: any) => {
            if (event.event_type === "download") acc.downloads += 1;
            else if (event.event_type === "signup") acc.signups += 1;
            else if (event.event_type === "purchase") acc.purchases += 1;
            return acc;
          }, { downloads: 0, signups: 0, purchases: 0 });
          const manualTotals = (chartManual || []).reduce((acc, manual: any) => {
            const count = Number(manual.count || 0);
            if (manual.event_type === "download") acc.downloads += count;
            else if (manual.event_type === "signup") acc.signups += count;
            else if (manual.event_type === "purchase") acc.purchases += count;
            return acc;
          }, { downloads: 0, signups: 0, purchases: 0 });
          setStats({
            clicks: clickCount || 0,
            downloads: eventTotals.downloads + manualTotals.downloads,
            signups: eventTotals.signups + manualTotals.signups,
            purchases: eventTotals.purchases + manualTotals.purchases,
          });
        }

        if (!isEngagement && !isManualMode) {
          await fetchTrackerInfo(id);
        }
      } catch (err) {
        console.error("Error loading campaign:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleRegenerateScript = async () => {
    if (!id) return;
    setRegenerating(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Missing auth session");

      const res = await fetch(edgeFnUrl("tracker-management", `/api/campaign/${id}/tracker/regenerate`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, apikey: supabase["supabaseKey"] || "" },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Regeneration failed");
      toast.success("Script regenerated to latest stable tracker release");
      setTrackerSnippet(payload.snippet || "");
      await fetchTrackerInfo(id);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to regenerate script"));
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!id) return;
    setRegeneratingKey(true);
    try {
      // Delete old keys
      await supabase.from("api_keys").delete().eq("campaign_id", id);

      // Generate new key
      const newKey = `kb_${crypto.randomUUID().replace(/-/g, "")}`;

      const { error } = await supabase.functions.invoke("manage-campaign", {
        body: { action: "create_api_key", campaign_id: id, api_key: newKey },
      });
      if (error) throw error;

      setApiKey(newKey);
      toast.success("API key regenerated. Update your integration with the new key.");
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to regenerate API key"));
    } finally {
      setRegeneratingKey(false);
    }
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center py-20"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></DashboardLayout>;
  if (!campaign) return <DashboardLayout><p className="text-muted-foreground">Campaign not found.</p></DashboardLayout>;

  const isManual = (campaign as any).campaign_mode === "manual";
  const isEngagement = (campaign as any).ad_type === "engagement";
  const showApiAndTracker = !isManual && !isEngagement;
  const statusColor = campaign.status === "active" ? "text-primary border-primary/20 bg-primary/5" :
    campaign.status === "pending" ? "text-amber-600 border-amber-500/20 bg-amber-500/5" :
    campaign.status === "paused" ? "text-orange-600 border-orange-500/20 bg-orange-500/5" :
    campaign.status === "completed" ? "text-primary border-primary/20 bg-primary/5" :
    "text-destructive border-destructive/20 bg-destructive/5";
  const canManageLive = ["active", "paused", "pending"].includes(String(campaign.status));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <MotionWrapper>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">{campaign.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">ID: {campaign.id.slice(0, 8)}…</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {isEngagement && (
                  <Badge variant="outline" className="text-[10px] capitalize border-primary/30 text-primary">
                    {creative?.media_type === "music" ? <Music className="h-3 w-3 mr-1" /> : <MonitorPlay className="h-3 w-3 mr-1" />}
                    Engagement · {creative?.media_type || "media"}
                  </Badge>
                )}
                {!isEngagement && (campaign as any).selected_milestones?.map((m: string) => (
                  <Badge key={m} variant="outline" className="text-[10px] capitalize">{m}</Badge>
                ))}
              </div>
            </div>
            <Badge variant="outline" className={statusColor}>{campaign.status}</Badge>
          </div>
        </MotionWrapper>

        {campaign.status === "pending" && (campaign as any).auto_activation_at && (
          <MotionWrapper delay={0.03}>
            <PendingCountdown targetDate={(campaign as any).auto_activation_at} />
          </MotionWrapper>
        )}

        {campaign.status === "paused" && (
          <MotionWrapper delay={0.03}>
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Campaign paused — escrow exhausted</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Top up your campaign escrow from your wallet to resume tracking events.
                </p>
              </div>
              <Button size="sm" onClick={() => setTopupOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Top up
              </Button>
            </div>
          </MotionWrapper>
        )}

        {canManageLive && (
          <MotionWrapper delay={0.04}>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setTopupOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Top up escrow
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleEndCampaign} disabled={endLoading}>
                <StopCircle className="h-3.5 w-3.5 mr-1.5" /> {endLoading ? "Ending…" : "End campaign"}
              </Button>
            </div>
          </MotionWrapper>
        )}

        <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Top up campaign escrow</DialogTitle>
              <DialogDescription>
                Move funds from your wallet (balance: ${walletBalance.toFixed(2)}) into this campaign's escrow.
                A paused campaign will resume immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Amount (USD)</label>
              <Input type="number" min="1" step="0.01" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="100.00" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTopupOpen(false)}>Cancel</Button>
              <Button onClick={handleTopupEscrow} disabled={topupLoading}>
                {topupLoading ? "Topping up…" : "Top up"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* API Key - only for non-manual, non-engagement campaigns */}
        {showApiAndTracker && (
        <MotionWrapper delay={0.05}>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-foreground">API Key</h3>
              <Button variant="outline" size="sm" onClick={handleRegenerateApiKey} disabled={regeneratingKey}>
                <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                {regeneratingKey ? "Regenerating..." : "Regenerate Key"}
              </Button>
            </div>
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
        )}

        {/* Tracker Script Lifecycle - only for non-manual, non-engagement */}
        {showApiAndTracker && (
        <MotionWrapper delay={0.08}>
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-foreground">Tracker Script Lifecycle</h3>
                <p className="text-xs text-muted-foreground">Regenerate script to latest stable release without recreating this campaign.</p>
              </div>
              <Button onClick={handleRegenerateScript} disabled={regenerating || !id} size="sm">
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${regenerating ? "animate-spin" : ""}`} />
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
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Latest generated snippet</p>
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(trackerSnippet); toast.success("Snippet copied!"); }}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground/70 whitespace-pre-wrap">{trackerSnippet}</pre>
              </div>
            )}
          </div>
        </MotionWrapper>
        )}

        {/* Engagement-specific: Media + Stats */}
        {isEngagement ? (
          <>
            {creative && (
              <MotionWrapper delay={0.05}>
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    {creative.media_type === "music" ? <Music className="h-4 w-4 text-primary" /> : <MonitorPlay className="h-4 w-4 text-primary" />}
                    {creative.media_type === "music" ? "Song" : "Video"} Link
                  </h3>
                  <a href={creative.media_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">
                    {creative.media_link}
                  </a>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Rate per {creative.media_type === "music" ? "listener" : "viewer"}</p>
                      <p className="text-lg font-semibold text-foreground">${Number(creative.rate_per_interaction).toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Target</p>
                      <p className="text-lg font-semibold text-foreground">{((campaign as any).target_users || 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Placement Fee</p>
                      <p className="text-lg font-semibold text-foreground">${Number(creative.placement_fee).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </MotionWrapper>
            )}

            <MotionStagger className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {[
                { icon: Users, label: creative?.media_type === "music" ? "Listeners" : "Viewers", value: engagementStats.interactions },
                { icon: CheckCircle2, label: "Correct Answers", value: engagementStats.correct },
                { icon: HelpCircle, label: "Questions", value: questions.length },
                { icon: Wallet, label: "Budget Left", value: `$${Number(campaign.budget_remaining).toFixed(2)}` },
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

            {dailyData.length > 0 && (
              <MotionWrapper delay={0.08}>
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-medium text-foreground mb-4">
                    Engagement Analytics (Last 30 Days){isManual ? " (includes manual entries)" : ""}
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="cIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0.15} /><stop offset="95%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0} /></linearGradient>
                        <linearGradient id="cCo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
                      </defs>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12, color: "hsl(var(--foreground))" }} />
                      <Area type="monotone" dataKey="interactions" name="Interactions" stroke="hsl(280, 80%, 60%)" strokeWidth={1.5} fillOpacity={1} fill="url(#cIn)" />
                      <Area type="monotone" dataKey="correct" name="Correct" stroke="hsl(var(--primary))" strokeWidth={1.5} fillOpacity={1} fill="url(#cCo)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </MotionWrapper>
            )}

            <MotionWrapper delay={0.1}>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" /> Quiz Questions
                  </h3>
                  <Badge variant="outline" className="text-[10px]">{questions.length} generated</Badge>
                </div>
                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {campaign.status === "pending"
                      ? "Questions will be auto-generated from your transcription once an admin approves this campaign."
                      : "No questions yet. Contact support if your campaign is active without questions."}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {questions.map((q, i) => (
                      <div key={q.id} className="flex items-start gap-2 rounded-lg bg-muted/40 p-3">
                        <span className="text-xs text-muted-foreground shrink-0">{i + 1}.</span>
                        <p className="text-sm text-foreground flex-1">{q.question}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">{q.correct_answer ? "True" : "False"}</Badge>
                        <button
                          onClick={() => { setRequestQuestion(q); setRequestReason(""); }}
                          className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                          title="Request changes"
                        >
                          <MessageSquareWarning className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground/70 mt-3">
                  Questions are managed by Karbali admins. Click the flag icon to request a change.
                </p>
              </div>
            </MotionWrapper>

            {/* Request changes dialog */}
            <Dialog open={!!requestQuestion} onOpenChange={(open) => !open && setRequestQuestion(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request changes to this question</DialogTitle>
                  <DialogDescription>
                    Tell our admin team what's wrong or what should be changed. They'll review and update if appropriate.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-sm text-foreground">{requestQuestion?.question}</p>
                  </div>
                  <Textarea
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="e.g. The correct answer should be False, not True, because…"
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRequestQuestion(null)}>Cancel</Button>
                  <Button
                    disabled={!requestReason.trim() || submittingRequest || !user?.id || !id}
                    onClick={async () => {
                      if (!user?.id || !id || !requestQuestion) return;
                      setSubmittingRequest(true);
                      const { error } = await supabase.from("quiz_change_requests" as any).insert({
                        campaign_id: id,
                        question_id: requestQuestion.id,
                        advertiser_id: user.id,
                        reason: requestReason.trim(),
                      });
                      setSubmittingRequest(false);
                      if (error) { toast.error(friendlyError(error)); return; }
                      toast.success("Request submitted. Admin will review shortly.");
                      setRequestQuestion(null);
                    }}
                  >
                    {submittingRequest ? "Submitting…" : "Submit request"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <>
            {/* Performance/Commerce Stats */}
            <MotionStagger className="grid gap-3 grid-cols-2 md:grid-cols-5">
              {[
                { icon: MousePointerClick, label: "Clicks", value: stats.clicks, metric: false, show: true },
                { icon: Download, label: "Downloads", value: stats.downloads, metric: true, show: (campaign as any).platform_type === "mobile_app" || (campaign as any).selected_milestones?.includes("download") },
                { icon: UserPlus, label: "Signups", value: stats.signups, metric: true, show: (campaign as any).selected_milestones?.includes("signup") ?? true },
                { icon: ShoppingCart, label: "Purchases", value: stats.purchases, metric: true, show: (campaign as any).selected_milestones?.includes("purchase") ?? true },
                { icon: Wallet, label: "Budget Left", value: `$${Number(campaign.budget_remaining).toFixed(2)}`, metric: false, show: true },
                { icon: Users, label: "Target", value: (campaign as any).target_users || "N/A", metric: false, show: true },
              ].filter((s) => s.show).map((s) => (
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

            {dailyData.length > 0 && (
              <MotionWrapper delay={0.1}>
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-medium text-foreground mb-4">Performance (Last 30 Days){isManual ? " (includes manual entries)" : ""}</h3>
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

            <MotionWrapper delay={0.15}>
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-medium text-foreground mb-3">Pricing</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { label: "Download", value: campaign.price_download, show: (campaign as any).platform_type === "mobile_app" || (campaign as any).selected_milestones?.includes("download") },
                    { label: "Signup", value: campaign.price_signup, show: (campaign as any).selected_milestones?.includes("signup") ?? true },
                    { label: "Purchase", value: campaign.price_purchase, show: (campaign as any).selected_milestones?.includes("purchase") ?? true },
                  ].filter((p) => p.show).map((p) => (
                    <div key={p.label} className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">{p.label}</p>
                      <p className="text-lg font-semibold text-foreground">${Number(p.value).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </MotionWrapper>
          </>
        )}

        <MotionWrapper delay={0.25}>
          <MigrationChart campaignId={campaign.id} title="Where your users are migrating from" />
        </MotionWrapper>
      </div>
    </DashboardLayout>
  );
}
