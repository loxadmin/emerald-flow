import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { Label } from "@/components/ui/label";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface Setting { id: string; key: string; value: string; description: string | null; }

export default function AdminSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("admin_settings").select("*").order("key");
      if (data) {
        setSettings(data as Setting[]);
        const values: Record<string, string> = {};
        data.forEach((s: Setting) => { values[s.key] = s.value; });
        setEditValues(values);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const saveSetting = async (key: string) => {
    setSaving(true);
    const { error } = await supabase.from("admin_settings").update({ value: editValues[key], updated_at: new Date().toISOString() }).eq("key", key);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success(`${key} updated`);
  };

  return (
    <DashboardLayout>
      <MotionWrapper className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Platform Settings</h1>
          <p className="text-muted-foreground">Configure API keys and platform options</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <>
            <GlassCard variant="strong">
              <GlassCardHeader>
                <GlassCardTitle>Payment Gateway Keys</GlassCardTitle>
                <GlassCardDescription>Configure Stripe and Paystack API keys for billing</GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                {settings.filter(s => s.key.includes("stripe") || s.key.includes("paystack")).map((setting) => (
                  <div key={setting.key} className="space-y-2">
                    <Label className="text-muted-foreground text-sm">{setting.description || setting.key}</Label>
                    <div className="flex gap-2">
                      <GlassInput value={editValues[setting.key] || ""} onChange={(e) => setEditValues({ ...editValues, [setting.key]: e.target.value })} type={setting.key.includes("secret") ? "password" : "text"} maxLength={500} />
                      <GlassButton size="sm" variant="secondary" onClick={() => saveSetting(setting.key)} disabled={saving}><Save className="h-4 w-4" /></GlassButton>
                    </div>
                  </div>
                ))}
              </GlassCardContent>
            </GlassCard>

            <GlassCard variant="strong">
              <GlassCardHeader><GlassCardTitle>Platform Settings</GlassCardTitle></GlassCardHeader>
              <GlassCardContent className="space-y-4">
                {settings.filter(s => !s.key.includes("stripe") && !s.key.includes("paystack")).map((setting) => (
                  <div key={setting.key} className="space-y-2">
                    <Label className="text-muted-foreground text-sm">{setting.description || setting.key}</Label>
                    <div className="flex gap-2">
                      <GlassInput value={editValues[setting.key] || ""} onChange={(e) => setEditValues({ ...editValues, [setting.key]: e.target.value })} maxLength={500} />
                      <GlassButton size="sm" variant="secondary" onClick={() => saveSetting(setting.key)} disabled={saving}><Save className="h-4 w-4" /></GlassButton>
                    </div>
                  </div>
                ))}
              </GlassCardContent>
            </GlassCard>
          </>
        )}
      </MotionWrapper>
    </DashboardLayout>
  );
}
