import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { CheckCircle, XCircle, Copy, Link as LinkIcon } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

export default function AdminCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Tables<"campaigns"> | null>(null);
  const [sources, setSources] = useState<Tables<"campaign_sources">[]>([]);
  const [referrals, setReferrals] = useState<Tables<"referrals">[]>([]);
  const [events, setEvents] = useState<Tables<"events">[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const { data: c } = await supabase.from("campaigns").select("*").eq("id", id).single();
    setCampaign(c);
    const { data: s } = await supabase.from("campaign_sources").select("*").eq("campaign_id", id);
    setSources(s || []);
    const { data: r } = await supabase.from("referrals").select("*").eq("campaign_id", id);
    setReferrals(r || []);
    const { data: e } = await supabase.from("events").select("*").eq("campaign_id", id).order("created_at", { ascending: false }).limit(20);
    setEvents(e || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (status: "active" | "pending" | "rejected") => {
    if (!id) return;
    const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Campaign ${status}`);
    if (status === "active" && referrals.length === 0) {
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

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></DashboardLayout>;
  if (!campaign) return <DashboardLayout><p className="text-muted-foreground">Campaign not found.</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <MotionWrapper>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
              <p className="text-sm text-muted-foreground">ID: {campaign.id}</p>
            </div>
            <div className="flex gap-2">
              {campaign.status !== "active" && (
                <GlassButton size="sm" variant="glow" onClick={() => updateStatus("active")}><CheckCircle className="mr-1 h-4 w-4" /> Approve</GlassButton>
              )}
              {campaign.status !== "rejected" && (
                <GlassButton size="sm" variant="destructive" onClick={() => updateStatus("rejected")}><XCircle className="mr-1 h-4 w-4" /> Reject</GlassButton>
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
                  { l: "Budget", v: `$${Number(campaign.budget_remaining).toFixed(2)}` },
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
    </DashboardLayout>
  );
}
