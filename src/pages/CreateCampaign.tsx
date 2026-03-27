import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { Label } from "@/components/ui/label";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";

export default function CreateCampaign() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", budget: "", priceDownload: "1.00", priceSignup: "2.00", pricePurchase: "5.00" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim() || !form.budget) { toast.error("Please fill in all required fields"); return; }
    const budget = parseFloat(form.budget);
    if (isNaN(budget) || budget <= 0) { toast.error("Budget must be a positive number"); return; }

    setLoading(true);
    const { data: campaign, error } = await supabase.from("campaigns").insert({
      advertiser_id: user.id, name: form.name.trim(), budget_remaining: budget,
      price_download: parseFloat(form.priceDownload) || 0, price_signup: parseFloat(form.priceSignup) || 0, price_purchase: parseFloat(form.pricePurchase) || 0,
    }).select().single();

    if (error) { toast.error(error.message); setLoading(false); return; }

    const apiKey = `kb_${crypto.randomUUID().replace(/-/g, "")}`;
    const { error: keyError } = await supabase.functions.invoke("manage-campaign", { body: { action: "create_api_key", campaign_id: campaign.id, api_key: apiKey } });
    setLoading(false);
    if (keyError) toast.error("Campaign created but API key generation failed. Contact support.");
    else toast.success("Campaign created successfully!");
    navigate(`/campaigns/${campaign.id}`);
  };

  return (
    <DashboardLayout>
      <MotionWrapper className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">Create Campaign</h1>
        <GlassCard variant="strong">
          <GlassCardHeader>
            <GlassCardTitle>Campaign Details</GlassCardTitle>
            <GlassCardDescription>Set up your performance-based campaign</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Campaign Name *</Label>
                <GlassInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My App Campaign" maxLength={200} required />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Budget (USD) *</Label>
                <GlassInput type="number" min="1" step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="1000.00" required />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { key: "priceDownload", label: "Price per Download ($)" },
                  { key: "priceSignup", label: "Price per Signup ($)" },
                  { key: "pricePurchase", label: "Price per Purchase ($)" },
                ].map((p) => (
                  <div key={p.key} className="space-y-2">
                    <Label className="text-muted-foreground text-sm">{p.label}</Label>
                    <GlassInput type="number" min="0" step="0.01" value={(form as any)[p.key]} onChange={(e) => setForm({ ...form, [p.key]: e.target.value })} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/60">Milestone billing: If a user completes purchase, only the purchase price is charged (not cumulative).</p>
              <GlassButton type="submit" className="w-full" variant="glow" disabled={loading}>
                {loading ? "Creating..." : "Create Campaign"}
              </GlassButton>
            </form>
          </GlassCardContent>
        </GlassCard>
      </MotionWrapper>
    </DashboardLayout>
  );
}
