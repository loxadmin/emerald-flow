import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CreateCampaign() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    budget: "",
    priceDownload: "1.00",
    priceSignup: "2.00",
    pricePurchase: "5.00",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim() || !form.budget) {
      toast.error("Please fill in all required fields");
      return;
    }
    const budget = parseFloat(form.budget);
    if (isNaN(budget) || budget <= 0) {
      toast.error("Budget must be a positive number");
      return;
    }

    setLoading(true);

    // Create campaign
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        advertiser_id: user.id,
        name: form.name.trim(),
        budget_remaining: budget,
        price_download: parseFloat(form.priceDownload) || 0,
        price_signup: parseFloat(form.priceSignup) || 0,
        price_purchase: parseFloat(form.pricePurchase) || 0,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Generate API key via edge function
    const apiKey = `kb_${crypto.randomUUID().replace(/-/g, "")}`;
    
    // Insert API key - use edge function for service role insert
    const { error: keyError } = await supabase.functions.invoke("manage-campaign", {
      body: { action: "create_api_key", campaign_id: campaign.id, api_key: apiKey },
    });

    setLoading(false);

    if (keyError) {
      toast.error("Campaign created but API key generation failed. Contact support.");
    } else {
      toast.success("Campaign created successfully!");
    }
    navigate(`/campaigns/${campaign.id}`);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl animate-fade-in">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Create Campaign</h1>
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>Set up your performance-based campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="My App Campaign"
                  maxLength={200}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (USD) *</Label>
                <Input
                  id="budget"
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  placeholder="1000.00"
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="priceDownload">Price per Download ($)</Label>
                  <Input
                    id="priceDownload"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.priceDownload}
                    onChange={(e) => setForm({ ...form, priceDownload: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceSignup">Price per Signup ($)</Label>
                  <Input
                    id="priceSignup"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.priceSignup}
                    onChange={(e) => setForm({ ...form, priceSignup: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePurchase">Price per Purchase ($)</Label>
                  <Input
                    id="pricePurchase"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.pricePurchase}
                    onChange={(e) => setForm({ ...form, pricePurchase: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Milestone billing: If a user completes purchase, only the purchase price is charged (not cumulative).
              </p>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Campaign"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
