import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { Plus, BarChart3, DollarSign, MousePointerClick, Tag } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: string;
  budget_remaining: number;
  created_at: string;
}

export default function Dashboard() {
  const { user, categoryStatus } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({ totalEvents: 0, totalSpent: 0, totalClicks: 0 });
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Fetch category name
      const { data: catData } = await supabase
        .from("advertiser_categories")
        .select("category_id, categories(name)")
        .eq("advertiser_id", user.id)
        .maybeSingle();
      if (catData) {
        setCategoryName((catData as any).categories?.name || null);
      }

      const { data: campaignsData } = await supabase.from("campaigns").select("*").eq("advertiser_id", user.id).order("created_at", { ascending: false });
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
      <div className="space-y-6 sm:space-y-8">
        <MotionWrapper>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage your campaigns and track performance</p>
              {categoryName && (
                <div className="mt-2 flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">Category:</span>
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs">{categoryName}</Badge>
                  {categoryStatus && (
                    <Badge variant="outline" className={
                      categoryStatus === "active" ? "border-primary/30 bg-primary/10 text-primary text-xs" :
                      "border-warning/30 bg-warning/10 text-warning text-xs"
                    }>
                      {categoryStatus}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <Link to="/campaigns/create">
              <GlassButton variant="glow" className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />New Campaign</GlassButton>
            </Link>
          </div>
        </MotionWrapper>

        <MotionStagger className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          {[
            { label: "Total Events", value: stats.totalEvents.toLocaleString(), icon: BarChart3 },
            { label: "Total Spent", value: `$${stats.totalSpent.toFixed(2)}`, icon: DollarSign },
            { label: "Active Campaigns", value: campaigns.filter(c => c.status === "active").length, icon: MousePointerClick },
          ].map((s) => (
            <MotionItem key={s.label}>
              <GlassCard className="glass-hover">
                <GlassCardHeader className="flex flex-row items-center justify-between pb-2">
                  <GlassCardTitle className="text-sm font-medium text-muted-foreground">{s.label}</GlassCardTitle>
                  <s.icon className="h-4 w-4 text-muted-foreground/50" />
                </GlassCardHeader>
                <GlassCardContent>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{s.value}</p>
                </GlassCardContent>
              </GlassCard>
            </MotionItem>
          ))}
        </MotionStagger>

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
                  <p className="text-muted-foreground">No campaigns yet.</p>
                  <Link to="/campaigns/create"><GlassButton variant="outline" className="mt-4">Create your first campaign</GlassButton></Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {campaigns.map((campaign) => (
                    <Link key={campaign.id} to={`/campaigns/${campaign.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border/50 p-3 sm:p-4 transition-all duration-200 hover:bg-accent/5 hover:border-border">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground/90 truncate">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground">Budget: ${Number(campaign.budget_remaining).toFixed(2)}</p>
                      </div>
                      <Badge variant="outline" className={`${statusColor(campaign.status)} shrink-0`}>{campaign.status}</Badge>
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
