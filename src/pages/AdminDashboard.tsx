import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { toast } from "sonner";
import { CheckCircle, XCircle, BarChart3, DollarSign, Users } from "lucide-react";

export default function AdminDashboard() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalCampaigns: 0, totalEvents: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data: allCampaigns } = await supabase.from("campaigns").select("*, profiles:advertiser_id(email, full_name)").order("created_at", { ascending: false });
    setCampaigns(allCampaigns || []);
    const { count: eventsCount } = await supabase.from("events").select("*", { count: "exact", head: true });
    const { data: txData } = await supabase.from("transactions").select("amount");
    const totalRevenue = txData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    setStats({ totalCampaigns: allCampaigns?.length || 0, totalEvents: eventsCount || 0, totalRevenue });
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateCampaignStatus = async (campaignId: string, status: "active" | "pending" | "rejected") => {
    const { error } = await supabase.from("campaigns").update({ status }).eq("id", campaignId);
    if (error) { toast.error(error.message); } else {
      toast.success(`Campaign ${status}`);
      if (status === "active") {
        const code = `ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
        await supabase.functions.invoke("manage-campaign", { body: { action: "create_referral", campaign_id: campaignId, code } });
      }
      fetchData();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <MotionWrapper>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white/95">Admin Panel</h1>
            <p className="text-white/40">Manage campaigns, approvals, and platform settings</p>
          </div>
        </MotionWrapper>

        {/* Stats */}
        <MotionStagger className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Total Campaigns", value: stats.totalCampaigns, icon: Users },
            { label: "Total Events", value: stats.totalEvents.toLocaleString(), icon: BarChart3 },
            { label: "Total Revenue", value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign },
          ].map((s) => (
            <MotionItem key={s.label}>
              <GlassCard className="glass-hover">
                <GlassCardHeader className="flex flex-row items-center justify-between pb-2">
                  <GlassCardTitle className="text-sm font-medium text-white/40">{s.label}</GlassCardTitle>
                  <s.icon className="h-4 w-4 text-white/20" />
                </GlassCardHeader>
                <GlassCardContent><p className="text-2xl font-bold text-white/90">{s.value}</p></GlassCardContent>
              </GlassCard>
            </MotionItem>
          ))}
        </MotionStagger>

        {/* Pending */}
        <MotionWrapper delay={0.15}>
          <GlassCard variant="strong">
            <GlassCardHeader><GlassCardTitle>Pending Approvals</GlassCardTitle></GlassCardHeader>
            <GlassCardContent>
              {loading ? (
                <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              ) : (
                <div className="space-y-2">
                  {campaigns.filter(c => c.status === "pending").length === 0 && <p className="text-white/35">No pending campaigns.</p>}
                  {campaigns.filter(c => c.status === "pending").map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] p-4">
                      <div>
                        <p className="font-medium text-white/85">{c.name}</p>
                        <p className="text-sm text-white/35">{(c.profiles as any)?.email || "Unknown"} • Budget: ${Number(c.budget_remaining).toFixed(2)}</p>
                      </div>
                      <div className="flex gap-2">
                        <GlassButton size="sm" variant="glow" onClick={() => updateCampaignStatus(c.id, "active")}>
                          <CheckCircle className="mr-1 h-4 w-4" /> Approve
                        </GlassButton>
                        <GlassButton size="sm" variant="destructive" onClick={() => updateCampaignStatus(c.id, "rejected")}>
                          <XCircle className="mr-1 h-4 w-4" /> Reject
                        </GlassButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        </MotionWrapper>

        {/* All Campaigns */}
        <MotionWrapper delay={0.25}>
          <GlassCard variant="strong">
            <GlassCardHeader><GlassCardTitle>All Campaigns</GlassCardTitle></GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-2">
                {campaigns.map((c) => (
                  <Link key={c.id} to={`/admin/campaigns/${c.id}`} className="flex items-center justify-between rounded-xl border border-white/[0.06] p-4 transition-all duration-200 hover:bg-white/[0.04] hover:border-white/[0.1]">
                    <div>
                      <p className="font-medium text-white/85">{c.name}</p>
                      <p className="text-sm text-white/35">{(c.profiles as any)?.email || "Unknown"} • ${Number(c.budget_remaining).toFixed(2)}</p>
                    </div>
                    <Badge variant="outline" className={
                      c.status === "active" ? "border-primary/30 bg-primary/10 text-primary" :
                      c.status === "pending" ? "border-warning/30 bg-warning/10 text-warning" :
                      "border-destructive/30 bg-destructive/10 text-destructive"
                    }>{c.status}</Badge>
                  </Link>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>
        </MotionWrapper>
      </div>
    </DashboardLayout>
  );
}
