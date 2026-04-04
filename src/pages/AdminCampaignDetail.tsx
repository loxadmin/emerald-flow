import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { CheckCircle, XCircle, Copy, Link as LinkIcon, Handshake, ExternalLink } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DailyData { date: string; downloads: number; signups: number; purchases: number; }

export default function AdminCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<(Tables<"campaigns"> & { target_users?: number; selected_milestones?: string[]; total_cost?: number; integration_verified?: boolean; integration_type?: string }) | null>(null);
  const [sources, setSources] = useState<Tables<"campaign_sources">[]>([]);
  const [referrals, setReferrals] = useState<Tables<"referrals">[]>([]);
  const [events, setEvents] = useState<Tables<"events">[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);

  // External Referral
  const [externalProgram, setExternalProgram] = useState<Tables<"external_referral_programs"> | null>(null);
  const [adminReferralCode, setAdminReferralCode] = useState("");
  const [adminReferralLink, setAdminReferralLink] = useState("");

  const fetchData = useCallback(async () => {
    if (!id) return;
    const { data: c } = await supabase.from("campaigns").select("*").eq("id", id).single();
    setCampaign(c as any);
    if (c?.integration_type === "external_referral") {
      const { data: ext } = await supabase.from("external_referral_programs" as any).select("*").eq("campaign_id", id).maybeSingle();
      if (ext) {
        setExternalProgram(ext as any);
        setAdminReferralCode(ext.admin_referral_code || "");
        setAdminReferralLink(ext.admin_referral_link || "");
      }
    }
    const { data: s } = await supabase.from("campaign_sources").select("*").eq("campaign_id", id);
    setSources(s || []);
    const { data: r } = await supabase.from("referrals").select("*").eq("campaign_id", id);
    setReferrals(r || []);
    const { data: e } = await supabase.from("events").select("*").eq("campaign_id", id).order("created_at", { ascending: false }).limit(20);
    setEvents(e || []);

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

    if (status === "active" && campaign?.integration_type === "external_referral") {
      if (!adminReferralCode.trim() || !adminReferralLink.trim()) {
        toast.error("Please provide both Admin Referral Code and Link for external programs.");
        return;
      }
      // Update external program details
      await supabase.from("external_referral_programs" as any).update({
        admin_referral_code: adminReferralCode.trim(),
        admin_referral_link: adminReferralLink.trim(),
        status: "active",
        updated_at: new Date().toISOString()
      } as any).eq("campaign_id", id);
    }

    const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Campaign ${status}`);
    if (status === "active" && referrals.length === 0 && campaign?.integration_type !== "external_referral") {
      const code = `ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      await supabase.functions.invoke("manage-campaign", { body: { action: "create_referral", campaign_id: id, code } });
    }
    fetchData();
  };

  const generateReferral = async () => {
    if (!id) return;
    const code = `ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const { error } = await supabase.functions.invoke("manage-campaign", { body: { action: "create_referral", campaign_id: id, code } });
    if (error) toast.error("Failed to create referral"); else { toast.success("Referral link created!"); fetchData(); }
  };

  if (loading) return <AdminLayout><div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></AdminLayout>;
  if (!campaign) return <AdminLayout><p className="text-muted-foreground">Campaign not found.</p></AdminLayout>;

  const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <MotionWrapper>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
              <p className="text-sm text-muted-foreground">ID: {campaign.id}</p>
              <div className="flex gap-1 mt-1">
                {((campaign as any).selected_milestones || []).map((m: string) => (
                  <Badge key={m} variant="outline" className="text-xs capitalize border-primary/20 text-primary/80">{m}</Badge>
                ))}
                {(campaign as any).integration_verified && <Badge variant="outline" className="text-xs border-primary/20 text-primary">✓ Verified</Badge>}
                <Badge variant="outline" className="text-xs capitalize border-border">{(campaign as any).integration_type || "custom"}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {campaign.status !== "active" && <GlassButton size="sm" variant="glow" onClick={() => updateStatus("active")}><CheckCircle className="mr-1 h-4 w-4" /> Approve</GlassButton>}
              {campaign.status !== "rejected" && <GlassButton size="sm" variant="destructive" onClick={() => updateStatus("rejected")}><XCircle className="mr-1 h-4 w-4" /> Reject</GlassButton>}
            </div>
          </div>
        </MotionWrapper>

        {externalProgram && (
          <MotionWrapper delay={0.05}>
            <GlassCard variant="strong" className="mb-6 border-primary/20">
              <GlassCardHeader><GlassCardTitle className="flex items-center gap-2 text-primary"><Handshake className="h-5 w-5" /> External Referral Program Details</GlassCardTitle></GlassCardHeader>
              <GlassCardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Referral Guide</h4>
                      <div className="rounded-lg bg-muted/30 p-3 text-sm text-foreground/90 whitespace-pre-wrap border border-border/50">
                        {externalProgram.referral_guide}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Compensation Structure</h4>
                      <div className="rounded-lg bg-muted/30 p-3 text-sm text-foreground/90 border border-border/50">
                        {externalProgram.compensation_structure}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Advertiser Registration Link</h4>
                      <a href={externalProgram.registration_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                        {externalProgram.registration_link} <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="space-y-4 border-l border-border/50 pl-6">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Admin Response (Required for Approval)</h4>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-medium">Admin Referral Code</label>
                      <input
                        type="text"
                        value={adminReferralCode}
                        onChange={(e) => setAdminReferralCode(e.target.value)}
                        placeholder="e.g. KARBALI_ADV_01"
                        className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-medium">Admin Referral Link</label>
                      <input
                        type="text"
                        value={adminReferralLink}
                        onChange={(e) => setAdminReferralLink(e.target.value)}
                        placeholder="https://external-referral.com/karbali"
                        className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground bg-primary/5 p-2 rounded-md border border-primary/10 italic">
                      Provide the referral code and link from the advertiser's platform that Karbali will use to track this campaign.
                    </p>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          </MotionWrapper>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <MotionWrapper delay={0.1}>
            <GlassCard variant="strong" className="h-full">
              <GlassCardHeader><GlassCardTitle>Details</GlassCardTitle></GlassCardHeader>
              <GlassCardContent className="space-y-3 text-sm">
                {[
                  { l: "Status", v: <Badge variant="outline" className="border-border">{campaign.status}</Badge> },
                  { l: "Budget Remaining", v: `$${Number(campaign.budget_remaining).toFixed(2)}` },
                  { l: "Total Cost", v: `$${Number((campaign as any).total_cost || 0).toFixed(2)}` },
                  { l: "Target Users", v: String((campaign as any).target_users || "—") },
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

        {/* Analytics chart */}
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
