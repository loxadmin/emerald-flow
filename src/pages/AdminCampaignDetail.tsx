import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, Copy, Link as LinkIcon } from "lucide-react";

export default function AdminCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
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
  };

  useEffect(() => { fetchData(); }, [id]);

  const updateStatus = async (status: "active" | "pending" | "rejected") => {
    if (!id) return;
    const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Campaign ${status}`);
    if (status === "active" && referrals.length === 0) {
      const code = `ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      await supabase.functions.invoke("manage-campaign", {
        body: { action: "create_referral", campaign_id: id, code },
      });
    }
    fetchData();
  };

  const generateReferral = async () => {
    if (!id) return;
    const code = `ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const { error } = await supabase.functions.invoke("manage-campaign", {
      body: { action: "create_referral", campaign_id: id, code },
    });
    if (error) toast.error("Failed to create referral");
    else { toast.success("Referral link created!"); fetchData(); }
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></DashboardLayout>;
  if (!campaign) return <DashboardLayout><p>Campaign not found.</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-sm text-muted-foreground">ID: {campaign.id}</p>
          </div>
          <div className="flex gap-2">
            {campaign.status !== "active" && (
              <Button size="sm" onClick={() => updateStatus("active")}>
                <CheckCircle className="mr-1 h-4 w-4" /> Approve
              </Button>
            )}
            {campaign.status !== "rejected" && (
              <Button size="sm" variant="destructive" onClick={() => updateStatus("rejected")}>
                <XCircle className="mr-1 h-4 w-4" /> Reject
              </Button>
            )}
          </div>
        </div>

        {/* Campaign Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline">{campaign.status}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span>${Number(campaign.budget_remaining).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Download Price</span><span>${Number(campaign.price_download).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Signup Price</span><span>${Number(campaign.price_signup).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Purchase Price</span><span>${Number(campaign.price_purchase).toFixed(2)}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Sources Detected</CardTitle></CardHeader>
            <CardContent>
              {sources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sources detected yet.</p>
              ) : (
                <div className="space-y-2">
                  {sources.map(s => (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{s.type}</Badge>
                      <span className="truncate">{s.url}</span>
                      {s.verified && <CheckCircle className="h-4 w-4 text-primary" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Referral Links */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Referral Links</CardTitle>
            <Button size="sm" variant="outline" onClick={generateReferral}>
              <LinkIcon className="mr-1 h-4 w-4" /> Generate Link
            </Button>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No referral links yet.</p>
            ) : (
              <div className="space-y-2">
                {referrals.map(r => {
                  const link = `${window.location.origin}/r/${r.code}`;
                  return (
                    <div key={r.id} className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-muted px-3 py-1.5 text-sm">{link}</code>
                      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied!"); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Events</CardTitle></CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <div className="space-y-2">
                {events.map(e => (
                  <div key={e.id} className="flex items-center justify-between rounded border p-3 text-sm">
                    <div>
                      <Badge variant="outline">{e.event_type}</Badge>
                      <span className="ml-2 text-muted-foreground">User: {e.external_user_id}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
