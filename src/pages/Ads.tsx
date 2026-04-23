import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { Plus, BarChart3, ArrowRight, FileEdit, Clock, CheckCircle, XCircle, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  id: string; name: string; status: string; budget_remaining: number; created_at: string;
  target_users: number; selected_milestones: string[]; total_cost: number;
  is_draft: boolean; integration_verified: boolean; integration_type: string;
}

const TABS = ["all", "draft", "pending", "active", "rejected", "completed"] as const;
type Tab = typeof TABS[number];

export default function AdsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    if (!user) return;
    const { data } = await supabase.from("campaigns").select("*").eq("advertiser_id", user.id).order("created_at", { ascending: false });
    setCampaigns((data as Campaign[]) || []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCampaigns(); }, [user?.id]);

  const deleteCampaign = async (e: React.MouseEvent, campaign: Campaign) => {
    e.preventDefault();
    e.stopPropagation();
    const label = campaign.is_draft ? "draft" : "campaign";
    if (!confirm(`Delete this ${label}? This cannot be undone.`)) return;
    setDeleting(campaign.id);

    // Refund unused escrow to wallet via secure server function
    let refundedAmount = 0;
    if (!campaign.is_draft && campaign.budget_remaining > 0) {
      const { data, error: refundError } = await supabase.rpc("refund_campaign_escrow", { _campaign_id: campaign.id });
      if (refundError) { toast.error("Refund failed: " + refundError.message); setDeleting(null); return; }
      refundedAmount = Number(data) || 0;
    }

    // Delete related records then campaign
    await supabase.from("api_keys").delete().eq("campaign_id", campaign.id);
    await supabase.from("campaign_sources").delete().eq("campaign_id", campaign.id);
    await supabase.from("referrals").delete().eq("campaign_id", campaign.id);
    const { error } = await supabase.from("campaigns").delete().eq("id", campaign.id);
    if (error) toast.error(error.message);
    else { toast.success(refundedAmount > 0 ? `Campaign deleted. $${refundedAmount.toFixed(2)} refunded.` : `${campaign.is_draft ? "Draft" : "Campaign"} deleted`); fetchCampaigns(); }
    setDeleting(null);
  };

  const filtered = campaigns.filter(c => {
    if (activeTab === "all") return true;
    if (activeTab === "draft") return c.is_draft;
    return c.status === activeTab && !c.is_draft;
  });

  const counts = {
    all: campaigns.length,
    draft: campaigns.filter(c => c.is_draft).length,
    pending: campaigns.filter(c => c.status === "pending" && !c.is_draft).length,
    active: campaigns.filter(c => c.status === "active").length,
    rejected: campaigns.filter(c => c.status === "rejected").length,
    completed: 0,
  };

  const statusIcon = (status: string, isDraft: boolean) => {
    if (isDraft) return <FileEdit className="h-4 w-4 text-muted-foreground" />;
    switch (status) {
      case "active": return <Play className="h-4 w-4 text-primary" />;
      case "pending": return <Clock className="h-4 w-4 text-amber-500" />;
      case "rejected": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusColor = (status: string, isDraft: boolean) => {
    if (isDraft) return "text-muted-foreground border-border bg-muted/50";
    switch (status) {
      case "active": return "text-primary border-primary/20 bg-primary/5";
      case "pending": return "text-amber-600 border-amber-500/20 bg-amber-500/5";
      case "rejected": return "text-destructive border-destructive/20 bg-destructive/5";
      default: return "";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <MotionWrapper>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Ads</h1>
              <p className="text-sm text-muted-foreground">Manage all your advertising campaigns</p>
            </div>
            <Link to="/campaigns/create">
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New Campaign</Button>
            </Link>
          </div>
        </MotionWrapper>

        {/* Tabs */}
        <MotionWrapper delay={0.05}>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm capitalize transition-colors whitespace-nowrap ${
                  activeTab === tab ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}>
                {tab}
                {counts[tab] > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {counts[tab]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </MotionWrapper>

        {/* Campaign list */}
        <MotionWrapper delay={0.1}>
          <div className="rounded-xl border border-border bg-card">
            <div className="px-5 py-4">
              {loading ? (
                <div className="flex justify-center py-12"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground mb-3">
                    {activeTab === "all" ? "No campaigns yet" : `No ${activeTab} campaigns`}
                  </p>
                  {activeTab === "all" && (
                    <Link to="/campaigns/create"><Button variant="outline" size="sm">Create your first campaign</Button></Link>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 py-4">
                      <Link to={c.is_draft ? `/campaigns/create?draft=${c.id}` : `/campaigns/${c.id}`}
                        className="flex items-center justify-between gap-3 flex-1 min-w-0 group">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {statusIcon(c.status, c.is_draft)}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                {c.name}
                              </p>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor(c.status, c.is_draft)}`}>
                                {c.is_draft ? "Draft" : c.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {new Date(c.created_at).toLocaleDateString()}
                              </span>
                              {c.target_users > 0 && <span className="text-xs text-muted-foreground">{c.target_users} users</span>}
                              {c.total_cost > 0 && <span className="text-xs text-muted-foreground">${Number(c.total_cost).toFixed(2)}</span>}
                              {c.integration_type === "engagement" ? (
                                <span className="text-xs text-muted-foreground capitalize">quiz interactions</span>
                              ) : c.selected_milestones?.length > 0 ? (
                                <span className="text-xs text-muted-foreground capitalize">
                                  {c.selected_milestones.join(", ")}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                      </Link>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0"
                          disabled={deleting === c.id} onClick={(e) => deleteCampaign(e, c)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </MotionWrapper>
      </div>
    </DashboardLayout>
  );
}
