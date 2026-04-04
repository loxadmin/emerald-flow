import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { toast } from "sonner";
import { CheckCircle, XCircle, BarChart3, DollarSign, Users, RefreshCw } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type CampaignWithProfile = Tables<"campaigns"> & {
  profiles: { email: string; full_name: string | null } | null;
  target_users?: number;
  selected_milestones?: string[];
  integration_verified?: boolean;
  total_cost?: number;
  is_draft?: boolean;
};

interface DailyData { date: string; events: number; revenue: number; }
interface CategoryChangeReq {
  id: string; advertiser_id: string; current_category_id: string;
  requested_category_id: string; reason: string; status: string;
  created_at: string;
  advertiser_email?: string;
  current_name?: string;
  requested_name?: string;
}

interface ExternalReferralReq {
  id: string;
  campaign_id: string;
  advertiser_id: string;
  referral_guide: string;
  compensation_structure: string;
  registration_link: string;
  status: string;
  created_at: string;
  advertiser_email?: string;
  campaign_name?: string;
}

export default function AdminDashboard() {
  const [campaigns, setCampaigns] = useState<CampaignWithProfile[]>([]);
  const [stats, setStats] = useState({ totalCampaigns: 0, totalEvents: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [categoryRequests, setCategoryRequests] = useState<CategoryChangeReq[]>([]);
  const [externalRequests, setExternalRequests] = useState<ExternalReferralReq[]>([]);

  const fetchData = async () => {
    const { data: allCampaigns } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    // Filter out drafts for admin view
    const nonDraftCampaigns = (allCampaigns || []).filter((c: any) => !c.is_draft);
    const advertiserIds = [...new Set(nonDraftCampaigns.map(c => c.advertiser_id))];
    const { data: profilesData } = advertiserIds.length > 0
      ? await supabase.from("profiles").select("id, email, full_name").in("id", advertiserIds)
      : { data: [] };
    const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
    const campaignsWithProfiles = nonDraftCampaigns.map(c => ({ ...c, profiles: profilesMap.get(c.advertiser_id) || null }));
    setCampaigns(campaignsWithProfiles as CampaignWithProfile[]);

    const { count: eventsCount } = await supabase.from("events").select("*", { count: "exact", head: true });
    const { data: txData } = await supabase.from("transactions").select("amount");
    const totalRevenue = txData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    setStats({ totalCampaigns: nonDraftCampaigns.length, totalEvents: eventsCount || 0, totalRevenue });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: events } = await supabase.from("events").select("created_at").gte("created_at", thirtyDaysAgo);
    const { data: txRecent } = await supabase.from("transactions").select("amount, created_at").gte("created_at", thirtyDaysAgo);
    const byDay: Record<string, DailyData> = {};
    events?.forEach(e => {
      const day = new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!byDay[day]) byDay[day] = { date: day, events: 0, revenue: 0 };
      byDay[day].events++;
    });
    txRecent?.forEach(t => {
      const day = new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!byDay[day]) byDay[day] = { date: day, events: 0, revenue: 0 };
      byDay[day].revenue += Number(t.amount);
    });
    setDailyData(Object.values(byDay));

    // Fetch category change requests
    const { data: reqData } = await supabase.from("category_change_requests" as any).select("*").eq("status", "pending").order("created_at", { ascending: false });
    if (reqData && (reqData as any[]).length > 0) {
      const reqs = reqData as any as CategoryChangeReq[];
      const reqAdvertiserIds = [...new Set(reqs.map(r => r.advertiser_id))];
      const catIds = [...new Set([...reqs.map(r => r.current_category_id), ...reqs.map(r => r.requested_category_id)])];
      const { data: reqProfiles } = await supabase.from("profiles").select("id, email").in("id", reqAdvertiserIds);
      const { data: reqCats } = await supabase.from("categories").select("id, name").in("id", catIds);
      const profMap = new Map((reqProfiles || []).map(p => [p.id, p.email]));
      const catMap = new Map((reqCats || []).map(c => [c.id, c.name]));
      setCategoryRequests(reqs.map(r => ({
        ...r,
        advertiser_email: profMap.get(r.advertiser_id) || "Unknown",
        current_name: catMap.get(r.current_category_id) || "Unknown",
        requested_name: catMap.get(r.requested_category_id) || "Unknown",
      })));
    }

    // Fetch external referral program requests
    const { data: extData } = await supabase.from("external_referral_programs" as any).select("*, campaigns(name)").eq("status", "pending").order("created_at", { ascending: false });
    if (extData && (extData as any[]).length > 0) {
      const reqs = extData as any as (ExternalReferralReq & { campaigns: { name: string } })[];
      const extAdvertiserIds = [...new Set(reqs.map(r => r.advertiser_id))];
      const { data: extProfiles } = await supabase.from("profiles").select("id, email").in("id", extAdvertiserIds);
      const profMap = new Map((extProfiles || []).map(p => [p.id, p.email]));
      setExternalRequests(reqs.map(r => ({
        ...r,
        advertiser_email: profMap.get(r.advertiser_id) || "Unknown",
        campaign_name: r.campaigns?.name || "Unknown",
      })));
    } else {
      setExternalRequests([]);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateCampaignStatus = async (campaignId: string, status: "active" | "pending" | "rejected") => {
    const { error } = await supabase.from("campaigns").update({ status }).eq("id", campaignId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Campaign ${status}`);
    if (status === "active") {
      const code = `ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      await supabase.functions.invoke("manage-campaign", { body: { action: "create_referral", campaign_id: campaignId, code } });
    }
    fetchData();
  };

  const handleCategoryChangeRequest = async (reqId: string, action: "approved" | "rejected", req: CategoryChangeReq) => {
    if (action === "approved") {
      // Update the advertiser's category
      await supabase.from("advertiser_categories").update({ category_id: req.requested_category_id, status: "active" }).eq("advertiser_id", req.advertiser_id);
    }
    await supabase.from("category_change_requests" as any).update({ status: action, updated_at: new Date().toISOString() } as any).eq("id", reqId);
    toast.success(`Category change ${action}`);
    fetchData();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "border-primary/30 bg-primary/10 text-primary";
      case "pending": return "border-warning/30 bg-warning/10 text-warning";
      default: return "border-destructive/30 bg-destructive/10 text-destructive";
    }
  };

  const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <MotionWrapper>
          <div><h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Panel</h1><p className="text-muted-foreground">Manage campaigns, approvals, and platform settings</p></div>
        </MotionWrapper>

        <MotionStagger className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Total Campaigns", value: stats.totalCampaigns, icon: Users },
            { label: "Total Events", value: stats.totalEvents.toLocaleString(), icon: BarChart3 },
            { label: "Total Revenue", value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign },
          ].map((s) => (
            <MotionItem key={s.label}>
              <GlassCard className="glass-hover">
                <GlassCardHeader className="flex flex-row items-center justify-between pb-2">
                  <GlassCardTitle className="text-sm font-medium text-muted-foreground">{s.label}</GlassCardTitle>
                  <s.icon className="h-4 w-4 text-muted-foreground/50" />
                </GlassCardHeader>
                <GlassCardContent><p className="text-2xl font-bold text-foreground">{s.value}</p></GlassCardContent>
              </GlassCard>
            </MotionItem>
          ))}
        </MotionStagger>

        {dailyData.length > 0 && (
          <MotionWrapper delay={0.1}>
            <GlassCard variant="strong">
              <GlassCardHeader><GlassCardTitle>Platform Activity (Last 30 Days)</GlassCardTitle></GlassCardHeader>
              <GlassCardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorEv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} /></linearGradient>
                      <linearGradient id="colorRv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="events" stroke="hsl(160, 84%, 39%)" fillOpacity={1} fill="url(#colorEv)" name="Events" />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(38, 92%, 50%)" fillOpacity={1} fill="url(#colorRv)" name="Revenue ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCardContent>
            </GlassCard>
          </MotionWrapper>
        )}

        {/* External Referral Requests */}
        {externalRequests.length > 0 && (
          <MotionWrapper delay={0.11}>
            <GlassCard variant="strong">
              <GlassCardHeader><GlassCardTitle className="flex items-center gap-2"><Handshake className="h-4 w-4" /> External Referral Requests</GlassCardTitle></GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-2">
                  {externalRequests.map(req => (
                    <div key={req.id} className="rounded-xl border border-border/50 p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{req.advertiser_email}</p>
                          <p className="text-xs text-muted-foreground">Campaign: <strong className="text-foreground">{req.campaign_name}</strong></p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">"{req.referral_guide}"</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Link to={`/admin/campaigns/${req.campaign_id}`}>
                            <GlassButton size="sm" variant="glow">
                              View Details
                            </GlassButton>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCardContent>
            </GlassCard>
          </MotionWrapper>
        )}

        {/* Category Change Requests */}
        {categoryRequests.length > 0 && (
          <MotionWrapper delay={0.12}>
            <GlassCard variant="strong">
              <GlassCardHeader><GlassCardTitle className="flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Category Change Requests</GlassCardTitle></GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-2">
                  {categoryRequests.map(req => (
                    <div key={req.id} className="rounded-xl border border-border/50 p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{req.advertiser_email}</p>
                          <p className="text-xs text-muted-foreground">{req.current_name} → <strong className="text-foreground">{req.requested_name}</strong></p>
                          <p className="text-xs text-muted-foreground mt-1 italic">"{req.reason}"</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <GlassButton size="sm" variant="glow" onClick={() => handleCategoryChangeRequest(req.id, "approved", req)}>
                            <CheckCircle className="mr-1 h-4 w-4" /> Approve
                          </GlassButton>
                          <GlassButton size="sm" variant="destructive" onClick={() => handleCategoryChangeRequest(req.id, "rejected", req)}>
                            <XCircle className="mr-1 h-4 w-4" /> Reject
                          </GlassButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCardContent>
            </GlassCard>
          </MotionWrapper>
        )}

        <MotionWrapper delay={0.15}>
          <GlassCard variant="strong">
            <GlassCardHeader><GlassCardTitle>Pending Approvals</GlassCardTitle></GlassCardHeader>
            <GlassCardContent>
              {loading ? (
                <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              ) : (
                <div className="space-y-2">
                  {campaigns.filter(c => c.status === "pending").length === 0 && <p className="text-muted-foreground">No pending campaigns.</p>}
                  {campaigns.filter(c => c.status === "pending").map((c) => (
                    <div key={c.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-border/50 p-4">
                      <div>
                        <p className="font-medium text-foreground/90">{c.name}</p>
                        <p className="text-sm text-muted-foreground">{c.profiles?.email || "Unknown"} | Target: {(c as any).target_users || "—"} users | Cost: ${Number((c as any).total_cost || c.budget_remaining).toFixed(2)}</p>
                        <div className="flex gap-1 mt-1">
                          {((c as any).selected_milestones || []).map((m: string) => (
                            <Badge key={m} variant="outline" className="text-xs capitalize border-primary/20 text-primary/80">{m}</Badge>
                          ))}
                          {(c as any).integration_verified && <Badge variant="outline" className="text-xs border-primary/20 text-primary">✓ Verified</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
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

        <MotionWrapper delay={0.25}>
          <GlassCard variant="strong">
            <GlassCardHeader><GlassCardTitle>All Campaigns</GlassCardTitle></GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-2">
                {campaigns.map((c) => (
                  <Link key={c.id} to={`/admin/campaigns/${c.id}`} className="flex items-center justify-between rounded-xl border border-border/50 p-4 transition-all duration-200 hover:bg-accent/5 hover:border-border">
                    <div>
                      <p className="font-medium text-foreground/90">{c.name}</p>
                      <p className="text-sm text-muted-foreground">{c.profiles?.email || "Unknown"} | ${Number(c.budget_remaining).toFixed(2)}</p>
                    </div>
                    <Badge variant="outline" className={statusColor(c.status)}>{c.status}</Badge>
                  </Link>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>
        </MotionWrapper>
      </div>
    </AdminLayout>
  );
}
