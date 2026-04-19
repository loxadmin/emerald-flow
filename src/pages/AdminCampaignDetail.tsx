import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { CheckCircle, XCircle, Copy, Link as LinkIcon, Plus, Loader2, HelpCircle, Trash2, Sparkles, MessageSquareWarning } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tables } from "@/integrations/supabase/types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DailyData { date: string; downloads: number; signups: number; purchases: number; }

export default function AdminCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<(Tables<"campaigns"> & { target_users?: number; selected_milestones?: string[]; total_cost?: number; integration_verified?: boolean; integration_type?: string; campaign_mode?: string; platform_type?: string; app_link?: string }) | null>(null);
  const [sources, setSources] = useState<Tables<"campaign_sources">[]>([]);
  const [referrals, setReferrals] = useState<Tables<"referrals">[]>([]);
  const [events, setEvents] = useState<Tables<"events">[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [clickCount, setClickCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Manual event form
  const [manualEventType, setManualEventType] = useState("signup");
  const [manualCount, setManualCount] = useState("1");
  const [manualPurchaseAmount, setManualPurchaseAmount] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [recordingEvent, setRecordingEvent] = useState(false);
  const [manualEvents, setManualEvents] = useState<any[]>([]);
  const [uploadingMetrics, setUploadingMetrics] = useState(false);
  const [metricsUploadNotes, setMetricsUploadNotes] = useState("");
  const [metricsFileName, setMetricsFileName] = useState("");

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

    // Engagement: questions + change requests
    const [{ data: qs }, { data: crs }] = await Promise.all([
      supabase.from("campaign_questions").select("*").eq("campaign_id", id).order("created_at"),
      supabase.from("quiz_change_requests" as any).select("*").eq("campaign_id", id).order("created_at", { ascending: false }),
    ]);
    setQuestions(qs || []);
    setChangeRequests((crs as any[]) || []);

    // Chart
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: chartEvents } = await supabase.from("events").select("event_type, created_at").eq("campaign_id", id).gte("created_at", thirtyDaysAgo);
    if (chartEvents && chartEvents.length > 0) {
      const byDay: Record<string, DailyData> = {};
      chartEvents.forEach(ev => {
        const day = new Date(ev.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (!byDay[day]) byDay[day] = { date: day, downloads: 0, signups: 0, purchases: 0 };
        if (ev.event_type === "download") byDay[day].downloads++;
        else if (ev.event_type === "signup") byDay[day].signups++;
        else if (ev.event_type === "purchase") byDay[day].purchases++;
      });
      setDailyData(Object.values(byDay));
    }
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
        await supabase.functions.invoke("manage-campaign", { body: { action: "generate_questions", campaign_id: id } });
        toast.success("Quiz questions auto-generated!");
      }
    }
    fetchData();
  };

  const generateReferral = async () => {
    if (!id) return;
    const code = `ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const { error } = await supabase.functions.invoke("manage-campaign", { body: { action: "create_referral", campaign_id: id, code } });
    if (error) toast.error("Failed to create referral"); else { toast.success("Referral link created!"); fetchData(); }
  };

  const handleRecordManualEvent = async () => {
    if (!id) return;
    const count = Number(manualCount);
    if (count < 1) { toast.error("Count must be at least 1"); return; }
    if (manualEventType === "purchase" && (!manualPurchaseAmount || Number(manualPurchaseAmount) <= 0)) {
      toast.error("Enter a purchase amount"); return;
    }

    setRecordingEvent(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await supabase.functions.invoke("manage-manual-events", {
        body: {
          action: "record_events",
          campaign_id: id,
          event_type: manualEventType,
          count,
          purchase_amount: manualEventType === "purchase" ? Number(manualPurchaseAmount) : null,
          notes: manualNotes || null,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;
      if (result.error) throw new Error(result.error);
      toast.success(`Recorded ${count} ${manualEventType}(s). Deducted $${result.deducted?.toFixed(2)} from escrow.`);
      setManualCount("1");
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
    if (!confirm("Regenerate all quiz questions? This deletes existing ones.")) return;
    setGeneratingQuestions(true);
    try {
      await supabase.from("campaign_questions").delete().eq("campaign_id", id);
      const { error } = await supabase.functions.invoke("manage-campaign", {
        body: { action: "generate_questions", campaign_id: id },
      });
      if (error) throw error;
      toast.success("Questions regenerated");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate");
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const parseMetricsCsv = (csvContent: string) => {
    const rows = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (rows.length < 2) {
      throw new Error("CSV file must include a header and at least one row");
    }

    const header = rows[0].split(",").map((col) => col.trim().toLowerCase());
    const requiredColumns = ["event_type", "count"];
    const missingColumns = requiredColumns.filter((column) => !header.includes(column));

    if (missingColumns.length > 0) {
      throw new Error(`Missing required CSV columns: ${missingColumns.join(", ")}`);
    }

    const eventTypeIndex = header.indexOf("event_type");
    const countIndex = header.indexOf("count");
    const purchaseAmountIndex = header.indexOf("purchase_amount");
    const notesIndex = header.indexOf("notes");

    const parsedRows = rows.slice(1).map((line, rowIndex) => {
      const values = line.split(",").map((value) => value.trim());
      const eventType = values[eventTypeIndex]?.toLowerCase();
      const count = Number(values[countIndex] || 0);
      const purchaseAmountRaw = purchaseAmountIndex >= 0 ? values[purchaseAmountIndex] : "";
      const purchaseAmount = purchaseAmountRaw ? Number(purchaseAmountRaw) : undefined;
      const notes = notesIndex >= 0 ? values[notesIndex] : undefined;

      if (!eventType || !["download", "signup", "purchase"].includes(eventType)) {
        throw new Error(`Row ${rowIndex + 2}: event_type must be download, signup, or purchase`);
      }
      if (!Number.isFinite(count) || count < 1) {
        throw new Error(`Row ${rowIndex + 2}: count must be at least 1`);
      }
      if (eventType === "purchase" && (!Number.isFinite(purchaseAmount) || purchaseAmount! <= 0)) {
        throw new Error(`Row ${rowIndex + 2}: purchase rows must include purchase_amount > 0`);
      }

      return {
        event_type: eventType,
        count,
        purchase_amount: eventType === "purchase" ? purchaseAmount : null,
        notes: notes || null,
      };
    });

    return parsedRows;
  };

  const handleMetricsFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!id) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setMetricsFileName(file.name);
    setUploadingMetrics(true);

    try {
      const parsed = parseMetricsCsv(await file.text());
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const uploadResults = await Promise.all(parsed.map(async (entry) => {
        const { data, error } = await supabase.functions.invoke("manage-manual-events", {
          body: {
            action: "record_events",
            campaign_id: id,
            event_type: entry.event_type,
            count: entry.count,
            purchase_amount: entry.purchase_amount,
            notes: [metricsUploadNotes.trim(), entry.notes].filter(Boolean).join(" | ") || null,
          },
          headers: { Authorization: `Bearer ${token}` },
        });

        if (error) throw error;
        const parsedData = typeof data === "string" ? JSON.parse(data) : data;
        if (parsedData.error) {
          throw new Error(parsedData.error);
        }
        return parsedData;
      }));

      const totalDeduction = uploadResults.reduce((sum, result) => sum + Number(result.deducted || 0), 0);
      const totalEvents = uploadResults.reduce((sum, result) => sum + Number(result.events_recorded || 0), 0);

      toast.success(`Uploaded metrics from ${file.name}: ${totalEvents} events recorded, $${totalDeduction.toFixed(2)} deducted.`);
      setMetricsUploadNotes("");
      event.target.value = "";
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload event metrics");
    } finally {
      setUploadingMetrics(false);
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
                {((campaign as any).selected_milestones || []).map((m: string) => (
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
            <div className="flex gap-2">
              {campaign.status !== "active" && <GlassButton size="sm" variant="glow" onClick={() => updateStatus("active")}><CheckCircle className="mr-1 h-4 w-4" /> Approve</GlassButton>}
              {campaign.status !== "rejected" && <GlassButton size="sm" variant="destructive" onClick={() => updateStatus("rejected")}><XCircle className="mr-1 h-4 w-4" /> Reject</GlassButton>}
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
                  { l: "Clicks", v: String(clickCount) },
                  { l: "Download Price", v: `$${Number(campaign.price_download).toFixed(2)}` },
                  { l: "Signup Price", v: `$${Number(campaign.price_signup).toFixed(2)}` },
                  { l: "Purchase Price", v: `$${Number(campaign.price_purchase).toFixed(2)}` },
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

        {/* Manual Event Recording — admin can record events for any active campaign.
            For API-mode campaigns this acts as a reconciliation/override that still debits escrow. */}
        {campaign.status === "active" && (
          <MotionWrapper delay={0.17}>
            <GlassCard variant="glow">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> {isManual ? "Record Manual Events" : "Admin Event Override"}
                </GlassCardTitle>
                {!isManual && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Campaign is in API mode. Events recorded here still debit the advertiser's escrow.
                  </p>
                )}
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Event Type</Label>
                    <Select value={manualEventType} onValueChange={setManualEventType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(((campaign as any).selected_milestones || []).length > 0
                          ? (campaign as any).selected_milestones
                          : ["download", "signup", "purchase"]
                        ).map((m: string) => (
                          <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Count</Label>
                    <Input type="number" min="1" value={manualCount} onChange={(e) => setManualCount(e.target.value)} />
                  </div>
                  {manualEventType === "purchase" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Purchase Amount ($)</Label>
                      <Input type="number" min="0" step="0.01" value={manualPurchaseAmount} onChange={(e) => setManualPurchaseAmount(e.target.value)} placeholder="0.00" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                    <Input value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Batch note..." />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Estimated deduction: <span className="text-foreground font-medium">
                      ${(() => {
                        const count = Number(manualCount) || 0;
                        if (manualEventType === "download") return (Number(campaign.price_download) * count).toFixed(2);
                        if (manualEventType === "signup") return (Number(campaign.price_signup) * count).toFixed(2);
                        if (manualEventType === "purchase") return ((1 + Number(manualPurchaseAmount || 0) * 0.10) * count).toFixed(2);
                        return "0.00";
                      })()}
                    </span>
                  </p>
                  <GlassButton size="sm" variant="glow" onClick={handleRecordManualEvent} disabled={recordingEvent}>
                    {recordingEvent ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                    Record Events
                  </GlassButton>
                </div>

                <div className="border-t border-border pt-3 space-y-3">
                  <p className="text-xs font-medium text-foreground">Upload Metrics CSV</p>
                  <p className="text-xs text-muted-foreground">
                    CSV format: <span className="font-mono">event_type,count,purchase_amount,notes</span>. Required columns are{" "}
                    <span className="font-mono">event_type</span> and <span className="font-mono">count</span>.
                  </p>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Batch Note (optional)</Label>
                      <Input
                        value={metricsUploadNotes}
                        onChange={(e) => setMetricsUploadNotes(e.target.value)}
                        placeholder="Imported from partner report..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Choose CSV</Label>
                      <Input
                        type="file"
                        accept=".csv,text/csv"
                        disabled={uploadingMetrics}
                        onChange={handleMetricsFileUpload}
                      />
                    </div>
                  </div>
                  {uploadingMetrics && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading metrics{metricsFileName ? ` from ${metricsFileName}` : ""}...
                    </div>
                  )}
                </div>

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
              <GlassCardHeader><GlassCardTitle>Campaign Analytics (Last 30 Days)</GlassCardTitle></GlassCardHeader>
              <GlassCardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="aDl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} /></linearGradient>
                      <linearGradient id="aSu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} /></linearGradient>
                      <linearGradient id="aPu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="downloads" stroke="hsl(217, 91%, 60%)" fillOpacity={1} fill="url(#aDl)" />
                    <Area type="monotone" dataKey="signups" stroke="hsl(160, 84%, 39%)" fillOpacity={1} fill="url(#aSu)" />
                    <Area type="monotone" dataKey="purchases" stroke="hsl(38, 92%, 50%)" fillOpacity={1} fill="url(#aPu)" />
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
      </div>
    </AdminLayout>
  );
}
