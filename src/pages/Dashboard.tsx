import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      
      setCampaigns((campaignsData as Campaign[]) || []);

      if (campaignsData && campaignsData.length > 0) {
        const campaignIds = campaignsData.map((c: Campaign) => c.id);
        
        const { count: eventsCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .in("campaign_id", campaignIds);

        const { data: txData } = await supabase
          .from("transactions")
          .select("amount")
          .in("campaign_id", campaignIds);

        const totalSpent = txData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        setStats({
          totalEvents: eventsCount || 0,
          totalSpent,
          totalClicks: 0,
        });
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-primary/10 text-primary border-primary/20";
      case "pending": return "bg-warning/10 text-warning border-warning/20";
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "";
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Manage your campaigns and track performance</p>
          </div>
          <Link to="/campaigns/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${stats.totalSpent.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Campaigns</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{campaigns.filter(c => c.status === "active").length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns list */}
        <Card>
          <CardHeader>
            <CardTitle>Your Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : campaigns.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No campaigns yet.</p>
                <Link to="/campaigns/create">
                  <Button variant="outline" className="mt-4">Create your first campaign</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    to={`/campaigns/${campaign.id}`}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Budget: ${Number(campaign.budget_remaining).toFixed(2)}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
