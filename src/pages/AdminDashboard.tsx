import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, BarChart3, DollarSign, Users } from "lucide-react";

export default function AdminDashboard() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalCampaigns: 0, totalEvents: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data: allCampaigns } = await supabase
      .from("campaigns")
      .select("*, profiles:advertiser_id(email, full_name)")
      .order("created_at", { ascending: false });
    setCampaigns(allCampaigns || []);

    const { count: eventsCount } = await supabase.from("events").select("*", { count: "exact", head: true });
    const { data: txData } = await supabase.from("transactions").select("amount");
    const totalRevenue = txData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    setStats({
      totalCampaigns: allCampaigns?.length || 0,
      totalEvents: eventsCount || 0,
      totalRevenue,
    });
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateCampaignStatus = async (campaignId: string, status: string) => {
    const { error } = await supabase
      .from("campaigns")
      .update({ status })
      .eq("id", campaignId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Campaign ${status}`);
      // If approved, generate a referral code
      if (status === "active") {
        const code = `ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
        await supabase.functions.invoke("manage-campaign", {
          body: { action: "create_referral", campaign_id: campaignId, code },
        });
      }
      fetchData();
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">Manage campaigns, approvals, and platform settings</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Campaigns</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats.totalCampaigns}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p></CardContent>
          </Card>
        </div>

        {/* Pending Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-3">
                {campaigns.filter(c => c.status === "pending").length === 0 && (
                  <p className="text-muted-foreground">No pending campaigns.</p>
                )}
                {campaigns
                  .filter(c => c.status === "pending")
                  .map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(c.profiles as any)?.email || "Unknown"} • Budget: ${Number(c.budget_remaining).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateCampaignStatus(c.id, "active")}>
                          <CheckCircle className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => updateCampaignStatus(c.id, "rejected")}>
                          <XCircle className="mr-1 h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>All Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaigns.map((c) => (
                <Link
                  key={c.id}
                  to={`/admin/campaigns/${c.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(c.profiles as any)?.email || "Unknown"} • ${Number(c.budget_remaining).toFixed(2)}
                    </p>
                  </div>
                  <Badge variant="outline" className={
                    c.status === "active" ? "bg-primary/10 text-primary" :
                    c.status === "pending" ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  }>{c.status}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
