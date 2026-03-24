import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Download, UserPlus, ShoppingCart } from "lucide-react";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ downloads: 0, signups: 0, purchases: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const { data: c } = await supabase.from("campaigns").select("*").eq("id", id).single();
      setCampaign(c);

      const { data: keys } = await supabase.from("api_keys").select("key").eq("campaign_id", id).limit(1);
      if (keys && keys.length > 0) setApiKey(keys[0].key);

      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      setEvents(eventsData || []);

      // Stats
      const { count: dl } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("campaign_id", id).eq("event_type", "download");
      const { count: su } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("campaign_id", id).eq("event_type", "signup");
      const { count: pu } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("campaign_id", id).eq("event_type", "purchase");
      setStats({ downloads: dl || 0, signups: su || 0, purchases: pu || 0 });
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const copyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success("API key copied!");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Campaign not found.</p>
      </DashboardLayout>
    );
  }

  const totalEvents = stats.downloads + stats.signups + stats.purchases;

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <p className="text-muted-foreground">Campaign ID: {campaign.id}</p>
          </div>
          <Badge
            variant="outline"
            className={
              campaign.status === "active"
                ? "bg-primary/10 text-primary"
                : campaign.status === "pending"
                ? "bg-warning/10 text-warning"
                : "bg-destructive/10 text-destructive"
            }
          >
            {campaign.status}
          </Badge>
        </div>

        {/* API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">API Key</CardTitle>
            <CardDescription>Use this key to send events from your application</CardDescription>
          </CardHeader>
          <CardContent>
            {apiKey ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-4 py-2 font-mono text-sm">{apiKey}</code>
                <Button variant="outline" size="sm" onClick={copyApiKey}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">API key not generated yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.downloads}</p>
                  <p className="text-xs text-muted-foreground">Downloads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <UserPlus className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.signups}</p>
                  <p className="text-xs text-muted-foreground">Signups</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.purchases}</p>
                  <p className="text-xs text-muted-foreground">Purchases</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-2xl font-bold">${Number(campaign.budget_remaining).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Budget Remaining</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversion Rates */}
        {totalEvents > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversion Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Signup Rate (from downloads)</p>
                  <p className="text-xl font-bold">
                    {stats.downloads > 0 ? ((stats.signups / stats.downloads) * 100).toFixed(1) : "0"}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Rate (from signups)</p>
                  <p className="text-xl font-bold">
                    {stats.signups > 0 ? ((stats.purchases / stats.signups) * 100).toFixed(1) : "0"}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Download</p>
                <p className="text-xl font-bold">${Number(campaign.price_download).toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Signup</p>
                <p className="text-xl font-bold">${Number(campaign.price_signup).toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Purchase</p>
                <p className="text-xl font-bold">${Number(campaign.price_purchase).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-muted-foreground">No events recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <Badge variant="outline">{event.event_type}</Badge>
                      <span className="ml-2 text-sm text-muted-foreground">User: {event.external_user_id}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Integration Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded bg-muted p-4 text-sm">
{`// Send events to Karbali
fetch("https://dvkoafztquswcqniwcyf.supabase.co/functions/v1/track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    api_key: "${apiKey || "YOUR_API_KEY"}",
    event_type: "signup", // download | signup | purchase
    user_id: "your_user_id",
    referral_id: "referral_code", // from cookie
    amount: null // for purchase events
  })
});`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
