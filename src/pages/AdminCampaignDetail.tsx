import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import MotionWrapper from "@/components/MotionWrapper";
import AutoActivationEditor from "@/components/AutoActivationEditor";
import AdminMigrationEntry from "@/components/AdminMigrationEntry";
import { toast } from "sonner";
import { CheckCircle, XCircle, Copy, Link as LinkIcon, Plus, Loader2, HelpCircle, Trash2, Sparkles, MessageSquareWarning } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tables } from "@/integrations/supabase/types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
interface CreativeCampaignRow {
  rate_per_interaction?: number | null;
  placement_fee?: number | null;
  min_interactions?: number | null;
  media_type?: string | null;
}

// supabase-js hides edge function error bodies behind a generic
// "non-2xx status code" message — pull the real error from the response.
const extractFunctionError = async (error: unknown): Promise<string> => {
  try {
    const ctx = (error as { context?: Response })?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json();
      if (body?.error) return body.error as string;
    }
  } catch { /* fall through to generic message */ }
  return (error as Error)?.message || "Request failed";
};

export default function AdminCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<(Tables<"campaigns"> & { target_users?: number; selected_milestones?: string[]; total_cost?: number; integration_verified?: boolean; integration_type?: string; campaign_mode?: string; platform_type?: string; app_link?: string }) | null>(null);
  const [sources, setSources] = useState<Tables<"campaign_sources">[]>([]);
  const [referrals, setReferrals] = useState<Tables<"referrals">[]>([]);
  const [events, setEvents] = useState<Tables<"events">[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [clickCount, setClickCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Manual event form: per-milestone counts
  const [manualCounts, setManualCounts] = useState<Record<string, string>>({});
  const [manualPurchaseAmount, setManualPurchaseAmount] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [recordingEvent, setRecordingEvent] = useState(false);
  const [manualEvents, setManualEvents] = useState<any[]>([]);

  // Engagement metrics
  const [offerwallStats, setOfferwallStats] = useState({ total: 0, correct: 0, incorrect: 0, points: 0, charged: 0 });
  const [creative, setCreative] = useState<CreativeCampaignRow | null>(null);
  const [manualInteractionCount, setManualInteractionCount] = useState("");
  const [manualCorrectCount, setManualCorrectCount] = useState("");
  const [recordingInteraction, setRecordingInteraction] = useState(false);

  // Engagement: questions + change requests
  const [questions, setQuestions] = useState<any[]>([]);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const { data: c } = await supabase.from("campaigns").select("*").eq("id", id).single();
    setCampaign(c as any);
    const { data: s } = await supabase.from("campaign_sources").select("*").eq("campaign_id", id);
    setSources(s || []);
    const { data: r } = await supabase.from("referrals").select("*").eq("campaign_id", id);
    setReferrals(r || []);
    const referralIds = (r || []).map((referral) => referral.id);
    const { count: trackedClicks } = referralIds.length > 0
      ? await supabase.from("clicks").select("*", { count: "exact", head: true }).in("referral_id", referralIds)
      : { count: 0 };
    setClickCount(trackedClicks || 0);
    const { data: e } = await supabase.from("events").select("*").eq("campaign_id", id).order("created_at", { ascending: false }).limit(20);
    setEvents(e || []);

    // Manual events
    const { data: me } = await supabase.from("manual_events" as any).select("*").eq("campaign_id", id).order("created_at", { ascending: false });
    setManualEvents((me as any[]) || []);

    // Engagement: offerwall interaction stats
    const [{ data: oi }, { data: creativeRow }, { data: qs }, { data: crs }] = await Promise.all([
      supabase
        .from("offerwall_interactions" as any)
        .select("is_correct, points_earned, charge_amount")
        .eq("campaign_id", id),
      supabase
        .from("creative_campaigns" as any)
        .select("rate_per_interaction, placement_fee, min_interactions, media_type")
        .eq("campaign_id", id)
        .maybeSingle(),
      supabase.from("campaign_questions").select("*").eq("campaign_id", id).order("created_at"),
      supabase.from("quiz_change_requests" as any).select("*").eq("campaign_id", id).order("created_at", { ascending: false }),
    ]);
    setCreative((creativeRow as CreativeCampaignRow | null) || null);
    if (oi) {
      const rows = oi as any[];
      const correct = rows.filter((r) => r.is_correct).length;
      setOfferwallStats({
        total: rows.length,
        correct,
        incorrect: rows.length - correct,
        points: rows.reduce((s, r) => s + Number(r.points_earned || 0), 0),
        charged: rows.reduce((s, r) => s + Number(r.charge_amount || 0), 0),
      });
    }

    // Engagement: questions + change requests
    setQuestions(qs || []);
    setChangeRequests((crs as any[]) || []);

    // Chart — combine real events + manual recordings + offerwall interactions over the last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sinceISO = since.toISOString();
    const [{ data: chartEvents }, { data: chartManual }, { data: chartInteractions }] = await Promise.all([
      supabase.from("events").select("event_type, amount, created_at").eq("campaign_id", id).gte("created_at", sinceISO),
      supabase.from("manual_events" as any).select("event_type, count, purchase_amount, created_at").eq("campaign_id", id).gte("created_at", sinceISO),
      supabase.from("offerwall_interactions" as any).select("is_correct, points_earned, created_at").eq("campaign_id", id).gte("created_at", sinceISO),
    ]);

    const byDay: Record<string, DailyData> = {};
    const ensure = (created: string): DailyData => {
      const d = new Date(created);
      const key = d.toISOString().slice(0, 10);
      if (!byDay[key]) {
        byDay[key] = {
          date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          ts: new Date(key).getTime(),
          downloads: 0, signups: 0, purchases: 0,
          interactions: 0, correct: 0, revenue: 0,
        };
      }
      return byDay[key];
    };

    (chartEvents || []).forEach((ev: any) => {
      const row = ensure(ev.created_at);
      if (ev.event_type === "download") row.downloads += 1;
      else if (ev.event_type === "signup") row.signups += 1;
      else if (ev.event_type === "purchase") {
        row.purchases += 1;
        row.revenue += Number(ev.amount || 0);
      }
    });

    (chartManual || []).forEach((m: any) => {
      const row = ensure(m.created_at);
      const n = Number(m.count || 0);
      if (m.event_type === "download") row.downloads += n;
      else if (m.event_type === "signup") row.signups += n;
      else if (m.event_type === "purchase") {
        row.purchases += n;
        row.revenue += Number(m.purchase_amount || 0);
      } else if (m.event_type === "interaction" || m.event_type === "engagement_interaction") {
        row.interactions += n;
      }
    });

    (chartInteractions || []).forEach((oi: any) => {
      const row = ensure(oi.created_at);
      row.interactions += 1;
      if (oi.is_correct) row.correct += 1;
    });

    setDailyData(Object.values(byDay).sort((a, b) => a.ts - b.ts));
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (status: "active" | "pending" | "rejected") => {
    if (!id) return;
    const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Campaign ${status}`);
    if (status === "active") {
      // Auto-create referral link
      if (referrals.length === 0) {
        const code = `ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
        await supabase.functions.invoke("manage-campaign", { body: { action: "create_referral", campaign_id: id, code } });
      }
      // For engagement campaigns, auto-generate questions
      if ((campaign as any)?.ad_type === "engagement") {
        const { error: qErr } = await supabase.functions.invoke("manage-campaign", { body: { action: "generate_questions", campaign_id: id } });
        if (qErr) {
          toast.warning(`Quiz not generated: ${await extractFunctionError(qErr)}`);
        } else {
          toast.success("Quiz questions auto-generated!");
        }
      }
      // Notify advertiser via email
      supabase.functions.invoke("send-campaign-notification", { body: { action: "approval", campaign_id: id } })
        .catch((e) => console.warn("approval email failed", e));
      supabase.functions.invoke("notify", { body: { event: "campaign_approved", payload: { campaign_id: id } } }).catch(() => {});
    }
    if (status === "rejected") {
      supabase.functions.invoke("notify", { body: { event: "campaign_rejected", payload: { campaign_id: id } } }).catch(() => {});
    }
    fetchData();
  };

  const generateReferral = async () => {
    if (!id) return;
    const code = `ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const { data, error } = await supabase.functions.invoke("manage-campaign", { body: { action: "create_referral", campaign_id: id, code } });
    const apiError = (data as { error?: string } | null)?.error;
    if (error || apiError) toast.error(apiError || "Failed to create referral"); else { toast.success("Referral link created!"); fetchData(); }

  };

  const handleRecordManualEvents = async () => {
    if (!id) return;
    const entries = Object.entries(manualCounts)
      .map(([type, raw]) => ({ type, count: Number(raw) }))
      .filter((e) => e.count > 0);
    if (entries.length === 0) { toast.error("Enter a count for at least one event type"); return; }
    const purchaseEntry = entries.find((e) => e.type === "purchase");
    if (purchaseEntry && (!manualPurchaseAmount || Number(manualPurchaseAmount) <= 0)) {
      toast.error("Enter the purchase amount for purchase events"); return;
    }

    setRecordingEvent(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      let totalDeducted = 0;
      let totalEvents = 0;
      for (const entry of entries) {
        const { data, error } = await supabase.functions.invoke("manage-manual-events", {
          body: {
            action: "record_events",
            campaign_id: id,
            event_type: entry.type,
            count: entry.count,
            purchase_amount: entry.type === "purchase" ? Number(manualPurchaseAmount) : null,
            notes: manualNotes || null,
          },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (error) throw error;
        const result = typeof data === "string" ? JSON.parse(data) : data;
        if (result.error) throw new Error(result.error);
        totalDeducted += Number(result.deducted || 0);
        totalEvents += Number(result.events_recorded || 0);
      }
      toast.success(`Recorded ${totalEvents} event(s). Deducted $${totalDeducted.toFixed(2)} from escrow.`);
      setManualCounts({});
      setManualPurchaseAmount("");
      setManualNotes("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record events");
    } finally {
      setRecordingEvent(false);
    }
  };

  const handleDeleteQuestion = async (qid: string) => {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("campaign_questions").delete().eq("id", qid);
    if (error) { toast.error(error.message); return; }
    toast.success("Question deleted");
    fetchData();
  };

  const handleRecordEngagementInteractions = async () => {
    if (!id) return;
    const count = Number(manualInteractionCount || 0);
    const correctCount = Number(manualCorrectCount || 0);
    if (count < 1) { toast.error("Enter at least one interaction"); return; }
    if (correctCount < 0 || correctCount > count) { toast.error("Correct answers must be between 0 and total interactions"); return; }
    if (questions.length === 0) { toast.error("Generate quiz questions before recording interactions"); return; }

    setRecordingInteraction(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await supabase.functions.invoke("manage-manual-events", {
        body: {
          action: "record_engagement_interactions",
          campaign_id: id,
          count,
          correct_count: correctCount,
          notes: manualNotes || null,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;
      if (result.error) throw new Error(result.error);
      toast.success(`Recorded ${count} engagement interaction(s) and deducted $${Number(result.deducted || 0).toFixed(2)}.`);
      setManualInteractionCount("");
      setManualCorrectCount("");
      setManualNotes("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record engagement interactions");
    } finally {
      setRecordingInteraction(false);
    }
  };

  const handleResolveRequest = async (reqId: string, status: "resolved" | "dismissed", notes?: string) => {
    const { error } = await supabase.from("quiz_change_requests" as any).update({
      status, admin_notes: notes || null, updated_at: new Date().toISOString(),
    }).eq("id", reqId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Request ${status}`);
    fetchData();
  };

  const handleRegenerateQuestions = async () => {
    if (!id) return;
    if (!confirm("Regenerate all quiz questions? This replaces existing ones.")) return;
    setGeneratingQuestions(true);
    try {
      const { error } = await supabase.functions.invoke("manage-campaign", {
        body: { action: "generate_questions", campaign_id: id },
      });
      if (error) throw new Error(await extractFunctionError(error));
      toast.success("Questions regenerated");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate");
    } finally {
      setGeneratingQuestions(false);
    }
  };

  if (loading) return <AdminLayout><div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></AdminLayout>;
  if (!campaign) return <AdminLayout><p className="text-muted-foreground">Campaign not found.</p></AdminLayout>;

  const isManual = (campaign as any).campaign_mode === "manual";
  const isEngagement = (campaign as any).ad_type === "engagement";
  const pendingRequests = changeRequests.filter((r) => r.status === "pending");
  const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <MotionWrapper>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
              <p className="text-sm text-muted-foreground">ID: {campaign.id}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {!isEngagement && ((campaign as any).selected_milestones || []).map((m: string) => (
                  <Badge key={m} variant="outline" className="text-xs capitalize border-primary/20 text-primary/80">{m}</Badge>
                ))}
                {(campaign as any).integration_verified && <Badge variant="outline" className="text-xs border-primary/20 text-primary">Verified</Badge>}
                <Badge variant="outline" className="text-xs capitalize border-border">{(campaign as any).integration_type || "custom"}</Badge>
                {(campaign as any).ad_type && (
                  <Badge variant="outline" className="text-xs capitalize border-amber-500/20 text-amber-600">{(campaign as any).ad_type} ads</Badge>
                )}
                {isManual && (
                  <Badge variant="outline" className="text-xs border-purple-500/20 text-purple-600 bg-purple-500/5">Manual Mode</Badge>
                )}
                {(campaign as any).platform_type === "mobile_app" && (
                  <Badge variant="outline" className="text-xs border-blue-500/20 text-blue-600">Mobile App</Badge>
                )}
              </div>
              {(campaign as any).app_link && (
                <p className="text-xs text-muted-foreground mt-1">App: <a href={(campaign as any).app_link} target="_blank" rel="noopener noreferrer" className="text-primary underline">{(campaign as any).app_link}</a></p>
              )}
            </div>
            <div className="flex flex-col gap-2 items-end">
              <div className="flex gap-2">
                {campaign.status !== "active" && <GlassButton size="sm" variant="glow" onClick={() => updateStatus("active")}><CheckCircle className="mr-1 h-4 w-4" /> Approve</GlassButton>}
                {campaign.status !== "rejected" && <GlassButton size="sm" variant="destructive" onClick={() => updateStatus("rejected")}><XCircle className="mr-1 h-4 w-4" /> Reject</GlassButton>}
              </div>
              {campaign.status === "pending" && (
                <AutoActivationEditor
                  campaignId={campaign.id}
                  value={(campaign as any).auto_activation_at}
                  onSaved={(v) => setCampaign((c) => (c ? ({ ...c, auto_activation_at: v } as any) : c))}
                />
              )}
            </div>
          </div>
        </MotionWrapper>

        <div className="grid gap-4 md:grid-cols-2">
          <MotionWrapper delay={0.1}>
            <GlassCard variant="strong" className="h-full">
              <GlassCardHeader><GlassCardTitle>Details</GlassCardTitle></GlassCardHeader>
              <GlassCardContent className="space-y-3 text-sm">
                {[
                  { l: "Status", v: <Badge variant="outline" className="border-border">{campaign.status}</Badge> },
                  { l: "Budget Remaining", v: `$${Number(campaign.budget_remaining).toFixed(2)}` },
                  { l: "Total Cost", v: `$${Number((campaign as any).total_cost || 0).toFixed(2)}` },
                  { l: "Target Users", v: String((campaign as any).target_users || "N/A") },
                  { l: isEngagement ? "Offerwall Opens" : "Clicks", v: String(isEngagement ? offerwallStats.total : clickCount) },
                  ...(!isEngagement ? [
                    { l: "Download Price", v: `$${Number(campaign.price_download).toFixed(2)}` },
                    { l: "Signup Price", v: `$${Number(campaign.price_signup).toFixed(2)}` },
                    { l: "Purchase Price", v: `$${Number(campaign.price_purchase).toFixed(2)}` },
                  ] : []),
                ].map((r) => (
                  <div key={r.l} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{r.l}</span>
                    <span className="text-foreground/80">{r.v}</span>
                  </div>
                ))}
              </GlassCardContent>
            </GlassCard>
          </MotionWrapper>
          <MotionWrapper delay={0.15}>
            <GlassCard variant="strong" className="h-full">
              <GlassCardHeader><GlassCardTitle>Sources Detected</GlassCardTitle></GlassCardHeader>
              <GlassCardContent>
                {sources.length === 0 ? <p className="text-sm text-muted-foreground">No sources detected yet.</p> : (
                  <div className="space-y-2">
                    {sources.map(s => (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="border-border">{s.type}</Badge>
                        <span className="truncate text-muted-foreground">{s.url}</span>
                        {s.verified && <CheckCircle className="h-4 w-4 text-primary" />}
                      </div>
                    ))}
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          </MotionWrapper>
        </div>

        {/* Manual Event Recording — only for conversion campaigns using tracked milestone events.
            API-mode campaigns may still be reconciled manually by admins. */}
        {campaign.status === "active" && !isEngagement && (
          <MotionWrapper delay={0.17}>
            <GlassCard variant="glow">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> {isManual ? "Record Manual Events" : "Admin Event Override"}
                </GlassCardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {isManual
                    ? "Use this only for performance campaigns that charge by tracked conversions."
                    : "API-mode conversion campaigns can be reconciled here and will still debit advertiser escrow."}
                </p>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                {(() => {
                  const milestones: string[] =
                    ((campaign as any).selected_milestones || []).length > 0
                      ? (campaign as any).selected_milestones
                      : ["download", "signup", "purchase"];
                  const hasPurchase = milestones.includes("purchase");
                  const purchaseCount = Number(manualCounts["purchase"] || 0);
                  const estimatedDeduction = milestones.reduce((sum, m) => {
                    const c = Number(manualCounts[m] || 0);
                    if (c <= 0) return sum;
                    if (m === "download") return sum + Number(campaign.price_download) * c;
                    if (m === "signup") return sum + Number(campaign.price_signup) * c;
                    if (m === "purchase") return sum + (1 + Number(manualPurchaseAmount || 0) * 0.10) * c;
                    return sum;
                  }, 0);

                  return (
                    <>
                      <div className="grid gap-3 md:grid-cols-3">
                        {milestones.map((m) => (
                          <div key={m} className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground capitalize">{m}s</Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={manualCounts[m] || ""}
                              onChange={(e) =>
                                setManualCounts((prev) => ({ ...prev, [m]: e.target.value }))
                              }
                            />
                            <p className="text-[10px] text-muted-foreground/70">
                              {m === "purchase"
                                ? "Charged $1 + 10% of purchase amount per event"
                                : `$${Number(m === "download" ? campaign.price_download : campaign.price_signup).toFixed(2)} per ${m}`}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {hasPurchase && purchaseCount > 0 && (
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Purchase Amount per event ($)</Label>
                            <Input type="number" min="0" step="0.01" value={manualPurchaseAmount} onChange={(e) => setManualPurchaseAmount(e.target.value)} placeholder="0.00" />
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                          <Input value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Batch note..." />
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground">
                          Estimated deduction:{" "}
                          <span className="text-foreground font-medium">${estimatedDeduction.toFixed(2)}</span>
                          <span className="ml-2 text-muted-foreground/70">
                            (Escrow available: ${Number(campaign.budget_remaining).toFixed(2)})
                          </span>
                        </p>
                        <GlassButton size="sm" variant="glow" onClick={handleRecordManualEvents} disabled={recordingEvent}>
                          {recordingEvent ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                          Record Events
                        </GlassButton>
                      </div>
                    </>
                  );
                })()}

                {/* Manual events history */}
                {manualEvents.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-medium text-foreground">Recent Manual Entries</p>
                    {manualEvents.slice(0, 10).map((me: any) => (
                      <div key={me.id} className="flex items-center justify-between text-xs rounded-lg border border-border/50 p-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{me.event_type}</Badge>
                          <span className="text-muted-foreground">x{me.count}</span>
                          {me.notes && <span className="text-muted-foreground/60 truncate max-w-[150px]">{me.notes}</span>}
                        </div>
                        <span className="text-foreground font-medium">-${Number(me.total_deducted).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          </MotionWrapper>
        )}

        {campaign.status === "active" && isEngagement && (
          <MotionWrapper delay={0.17}>
            <GlassCard variant="glow">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Record Engagement Interactions
                </GlassCardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Use this for admin-side reconciliation of offerwall opens on engagement campaigns.
                </p>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Interactions</Label>
                    <Input type="number" min="0" placeholder="0" value={manualInteractionCount} onChange={(e) => setManualInteractionCount(e.target.value)} />
                    <p className="text-[10px] text-muted-foreground/70">${Number(creative?.rate_per_interaction || 0.2).toFixed(2)} charged per interaction</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Correct Answers</Label>
                    <Input type="number" min="0" placeholder="0" value={manualCorrectCount} onChange={(e) => setManualCorrectCount(e.target.value)} />
                    <p className="text-[10px] text-muted-foreground/70">Correct answers award 1 point each</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                    <Input value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Batch note..." />
                    <p className="text-[10px] text-muted-foreground/70">Questions required: {questions.length}</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3 text-sm">
                  <div className="rounded-lg border border-border/50 p-3">
                    <p className="text-xs text-muted-foreground">Est. Deduction</p>
                    <p className="mt-1 font-medium text-foreground">${(Number(manualInteractionCount || 0) * Number(creative?.rate_per_interaction || 0.2)).toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 p-3">
                    <p className="text-xs text-muted-foreground">Escrow Available</p>
                    <p className="mt-1 font-medium text-foreground">${Number(campaign.budget_remaining).toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 p-3">
                    <p className="text-xs text-muted-foreground">Recorded Correct</p>
                    <p className="mt-1 font-medium text-foreground">{Number(manualCorrectCount || 0)}</p>
                  </div>
                </div>
                <div className="flex justify-end border-t border-border pt-3">
                  <GlassButton size="sm" variant="glow" onClick={handleRecordEngagementInteractions} disabled={recordingInteraction}>
                    {recordingInteraction ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                    Record Interactions
                  </GlassButton>
                </div>
                {manualEvents.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-medium text-foreground">Recent Manual Entries</p>
                    {manualEvents.slice(0, 10).map((me: any) => (
                      <div key={me.id} className="flex items-center justify-between text-xs rounded-lg border border-border/50 p-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{String(me.event_type).replace(/_/g, " ")}</Badge>
                          <span className="text-muted-foreground">x{me.count}</span>
                          {me.notes && <span className="text-muted-foreground/60 truncate max-w-[150px]">{me.notes}</span>}
                        </div>
                        <span className="text-foreground font-medium">-${Number(me.total_deducted).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          </MotionWrapper>
        )}

        {/* Engagement: Quiz Questions + Change Requests */}
        {isEngagement && (
          <>
            <MotionWrapper delay={0.17}>
              <GlassCard variant="strong">
                <GlassCardHeader className="flex flex-row items-center justify-between">
                  <GlassCardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" /> Quiz Questions ({questions.length})
                  </GlassCardTitle>
                  <GlassButton size="sm" variant="outline" onClick={handleRegenerateQuestions} disabled={generatingQuestions}>
                    {generatingQuestions ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                    Regenerate All
                  </GlassButton>
                </GlassCardHeader>
                <GlassCardContent>
                  {questions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No questions yet. Approve the campaign or click Regenerate to auto-generate from the transcription.</p>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {questions.map((q, i) => (
                        <div key={q.id} className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 p-3">
                          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{i + 1}.</span>
                          <p className="text-sm text-foreground flex-1">{q.question}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0">{q.correct_answer ? "True" : "False"}</Badge>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCardContent>
              </GlassCard>
            </MotionWrapper>

            {changeRequests.length > 0 && (
              <MotionWrapper delay={0.18}>
                <GlassCard variant="glow">
                  <GlassCardHeader>
                    <GlassCardTitle className="flex items-center gap-2">
                      <MessageSquareWarning className="h-4 w-4" /> Advertiser Change Requests ({pendingRequests.length} pending)
                    </GlassCardTitle>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {changeRequests.map((r) => {
                        const q = questions.find((qq) => qq.id === r.question_id);
                        return (
                          <div key={r.id} className="rounded-lg border border-border/50 p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">Question:</p>
                                <p className="text-sm text-foreground">{q?.question || "(question deleted)"}</p>
                              </div>
                              <Badge variant="outline" className="text-[10px] capitalize shrink-0">{r.status}</Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Advertiser reason:</p>
                              <p className="text-sm text-foreground/80">{r.reason}</p>
                            </div>
                            {r.status === "pending" && (
                              <div className="flex gap-2 pt-1">
                                <GlassButton size="sm" variant="outline" onClick={() => handleResolveRequest(r.id, "resolved")}>
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Resolved
                                </GlassButton>
                                <GlassButton size="sm" variant="ghost" onClick={() => handleResolveRequest(r.id, "dismissed")}>
                                  <XCircle className="h-3.5 w-3.5 mr-1" /> Dismiss
                                </GlassButton>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </GlassCardContent>
                </GlassCard>
              </MotionWrapper>
            )}
          </>
        )}

        {dailyData.length > 0 && (
          <MotionWrapper delay={0.18}>
            <GlassCard variant="strong">
              <GlassCardHeader>
                <GlassCardTitle>
                  Campaign Analytics — Last 30 Days{(campaign as any).campaign_mode === "manual" ? " (includes manual entries)" : ""}
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="aDl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} /></linearGradient>
                      <linearGradient id="aSu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} /></linearGradient>
                      <linearGradient id="aPu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} /></linearGradient>
                      <linearGradient id="aIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0} /></linearGradient>
                      <linearGradient id="aCo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} /></linearGradient>
                      <linearGradient id="aRv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    {isEngagement ? (
                      <>
                        <Area type="monotone" dataKey="interactions" name="Interactions" stroke="hsl(280, 80%, 60%)" fillOpacity={1} fill="url(#aIn)" />
                        <Area type="monotone" dataKey="correct" name="Correct" stroke="hsl(160, 84%, 39%)" fillOpacity={1} fill="url(#aCo)" />
                      </>
                    ) : (campaign as any).ad_type === "commerce" ? (
                      <>
                        <Area type="monotone" dataKey="purchases" name="Purchases" stroke="hsl(38, 92%, 50%)" fillOpacity={1} fill="url(#aPu)" />
                        <Area type="monotone" dataKey="revenue" name="Revenue ($)" stroke="hsl(160, 84%, 39%)" fillOpacity={1} fill="url(#aRv)" />
                      </>
                    ) : (
                      <>
                        <Area type="monotone" dataKey="downloads" name="Downloads" stroke="hsl(217, 91%, 60%)" fillOpacity={1} fill="url(#aDl)" />
                        <Area type="monotone" dataKey="signups" name="Signups" stroke="hsl(160, 84%, 39%)" fillOpacity={1} fill="url(#aSu)" />
                        <Area type="monotone" dataKey="purchases" name="Purchases" stroke="hsl(38, 92%, 50%)" fillOpacity={1} fill="url(#aPu)" />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCardContent>
            </GlassCard>
          </MotionWrapper>
        )}

        <MotionWrapper delay={0.2}>
          <GlassCard variant="glow">
            <GlassCardHeader className="flex flex-row items-center justify-between">
              <GlassCardTitle>Referral Links</GlassCardTitle>
              <GlassButton size="sm" variant="outline" onClick={generateReferral}><LinkIcon className="mr-1 h-4 w-4" /> Generate Link</GlassButton>
            </GlassCardHeader>
            <GlassCardContent>
              {referrals.length === 0 ? <p className="text-sm text-muted-foreground">No referral links yet.</p> : (
                <div className="space-y-2">
                  {referrals.map(r => {
                    const link = `${window.location.origin}/r/${r.code}`;
                    return (
                      <div key={r.id} className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded-lg bg-muted/50 border border-border/50 px-3 py-1.5 text-sm text-primary/80">{link}</code>
                        <GlassButton size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied!"); }}><Copy className="h-4 w-4" /></GlassButton>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        </MotionWrapper>

        <MotionWrapper delay={0.25}>
          <GlassCard>
            <GlassCardHeader><GlassCardTitle>Recent Events</GlassCardTitle></GlassCardHeader>
            <GlassCardContent>
              {events.length === 0 ? <p className="text-sm text-muted-foreground">No events yet.</p> : (
                <div className="space-y-2">
                  {events.map(e => (
                    <div key={e.id} className="flex items-center justify-between rounded-xl border border-border/50 p-3 text-sm">
                      <div>
                        <Badge variant="outline" className="border-primary/20 text-primary/80">{e.event_type}</Badge>
                        <span className="ml-2 text-muted-foreground">User: {e.external_user_id}</span>
                      </div>
                      <span className="text-xs text-muted-foreground/60">{new Date(e.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        </MotionWrapper>

        <MotionWrapper delay={0.3}>
          <AdminMigrationEntry
            advertiserId={campaign.advertiser_id}
            campaignId={campaign.id}
          />
        </MotionWrapper>
      </div>
    </AdminLayout>
  );
}
