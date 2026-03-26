import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { Plus, BarChart3, DollarSign, MousePointerClick } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: string;
  budget_remaining: number;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({ totalEvents: 0, totalSpent: 0, totalClicks: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: campaignsData } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
      setCampaigns((campaignsData as Campaign[]) || []);
      if (campaignsData && campaignsData.length > 0) {
        const campaignIds = campaignsData.map((c: Campaign) => c.id);
        const { count: eventsCount } = await supabase.from("events").select("*", { count: "exact", head: true }).in("campaign_id", campaignIds);
        const { data: txData } = await supabase.from("transactions").select("amount").in("campaign_id", campaignIds);
        const totalSpent = txData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        setStats({ totalEvents: eventsCount || 0, totalSpent, totalClicks: 0 });
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "border-primary/30 bg-primary/10 text-primary";
      case "pending": return "border-warning/30 bg-warning/10 text-warning";
      case "rejected": return "border-destructive/30 bg-destructive/10 text-destructive";
      default: return "";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <MotionWrapper>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white/95">Dashboard</h1>
              <p className="text-white/40">Manage your campaigns and track performance</p>
            </div>
            <Link to="/campaigns/create">
              <GlassButton variant="glow"><Plus className="mr-2 h-4 w-4" />New Campaign</GlassButton>
            </Link>
          </div>
        </MotionWrapper>

        {/* Stats */}
        <MotionStagger className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Total Events", value: stats.totalEvents.toLocaleString(), icon: BarChart3 },
            { label: "Total Spent", value: `$${stats.totalSpent.toFixed(2)}`, icon: DollarSign },
            { label: "Active Campaigns", value: campaigns.filter(c => c.status === "active").length, icon: MousePointerClick },
          ].map((s) => (
            <MotionItem key={s.label}>
              <GlassCard className="glass-hover">
                <GlassCardHeader className="flex flex-row items-center justify-between pb-2">
                  <GlassCardTitle className="text-sm font-medium text-white/40">{s.label}</GlassCardTitle>
                  <s.icon className="h-4 w-4 text-white/20" />
                </GlassCardHeader>
                <GlassCardContent>
                  <p className="text-2xl font-bold text-white/90">{s.value}</p>
                </GlassCardContent>
              </GlassCard>
            </MotionItem>
          ))}
        </MotionStagger>

        {/* Campaigns list */}
        <MotionWrapper delay={0.2}>
          <GlassCard variant="strong">
            <GlassCardHeader>
              <GlassCardTitle>Your Campaigns</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              {loading ? (
                <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              ) : campaigns.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-white/40">No campaigns yet.</p>
                  <Link to="/campaigns/create"><GlassButton variant="outline" className="mt-4">Create your first campaign</GlassButton></Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {campaigns.map((campaign) => (
                    <Link key={campaign.id} to={`/campaigns/${campaign.id}`} className="flex items-center justify-between rounded-xl border border-white/[0.06] p-4 transition-all duration-200 hover:bg-white/[0.04] hover:border-white/[0.1]">
                      <div>
                        <p className="font-medium text-white/85">{campaign.name}</p>
                        <p className="text-sm text-white/35">Budget: ${Number(campaign.budget_remaining).toFixed(2)}</p>
                      </div>
                      <Badge variant="outline" className={statusColor(campaign.status)}>{campaign.status}</Badge>
                    </Link>
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
