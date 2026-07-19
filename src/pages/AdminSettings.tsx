import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassButton } from "@/components/ui/glass-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Save, CreditCard, Settings2, ToggleLeft, ToggleRight, Construction, Sparkles } from "lucide-react";

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

  const activeGateway = editValues["active_payment_gateway"] || "paystack";
  const isMaintenanceOn = editValues["maintenance_mode"] === "true";
  const isManualModeOn = editValues["manual_mode_enabled"] === "true";

  const toggleMaintenanceMode = async () => {
    const newVal = isMaintenanceOn ? "false" : "true";
    setEditValues({ ...editValues, maintenance_mode: newVal });
    const { error } = await supabase.from("admin_settings").update({ value: newVal, updated_at: new Date().toISOString() }).eq("key", "maintenance_mode");
    if (error) toast.error(error.message); else toast.success(`Maintenance mode ${newVal === "true" ? "enabled" : "disabled"}`);
  };

  const setActiveGateway = async (gateway: string) => {
    setEditValues({ ...editValues, active_payment_gateway: gateway });
    const { error } = await supabase.from("admin_settings").update({ value: gateway, updated_at: new Date().toISOString() }).eq("key", "active_payment_gateway");
    if (error) toast.error(error.message); else toast.success(`Payment gateway switched to ${gateway}`);
  };

  const toggleManualMode = async () => {
    const newVal = isManualModeOn ? "false" : "true";
    setEditValues({ ...editValues, manual_mode_enabled: newVal });
    const { error } = await supabase.from("admin_settings").update({ value: newVal, updated_at: new Date().toISOString() }).eq("key", "manual_mode_enabled");
    if (error) toast.error(error.message); else toast.success(newVal === "true" ? "Switched to Simple mode" : "Switched to Advance mode");
  };

  const aiProvider = editValues["ai_provider"] || "lovable";
  const setAiProvider = async (provider: string) => {
    setEditValues({ ...editValues, ai_provider: provider });
    const defaults: Record<string, string> = {
      lovable: "google/gemini-2.5-flash",
      gemini: "gemini-2.0-flash",
      openai: "gpt-4o-mini",
    };
    await supabase.from("admin_settings").update({ value: provider, updated_at: new Date().toISOString() }).eq("key", "ai_provider");
    if (defaults[provider]) {
      setEditValues((v) => ({ ...v, ai_provider: provider, ai_model: defaults[provider] }));
      await supabase.from("admin_settings").update({ value: defaults[provider], updated_at: new Date().toISOString() }).eq("key", "ai_model");
    }
    toast.success(`AI provider set to ${provider === "lovable" ? "Lovable AI Gateway" : provider === "gemini" ? "Google Gemini (your key)" : "OpenAI (your key)"}`);
  };

  const paystackSettings = settings.filter(s => s.key.includes("paystack"));
  const flutterwaveSettings = settings.filter(s => s.key.includes("flutterwave"));
  const platformSettings = settings.filter(s => !s.key.includes("paystack") && !s.key.includes("flutterwave") && s.key !== "active_payment_gateway" && !s.key.startsWith("ai_"));
  const aiModelSetting = settings.find(s => s.key === "ai_model");


  const SettingRow = ({ setting }: { setting: Setting }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{setting.description || setting.key}</Label>
      <div className="flex gap-2">
        <Input
          value={editValues[setting.key] || ""}
          onChange={(e) => setEditValues({ ...editValues, [setting.key]: e.target.value })}
          type={setting.key.includes("secret") ? "password" : "text"}
          maxLength={500}
          className="text-sm"
        />
        <GlassButton size="sm" variant="secondary" onClick={() => saveSetting(setting.key)} disabled={saving}>
          <Save className="h-3.5 w-3.5" />
        </GlassButton>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <MotionWrapper className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Platform Settings</h1>
          <p className="text-sm text-muted-foreground">Configure API keys, payment gateways, and platform options</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <>
            {/* Maintenance Mode */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Construction className="h-5 w-5 text-amber-500" />
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Maintenance Mode</h3>
                    <p className="text-xs text-muted-foreground">When enabled, new advertisers without an activated wallet will see an "Under Development" page</p>
                  </div>
                </div>
                <Switch checked={isMaintenanceOn} onCheckedChange={toggleMaintenanceMode} />
              </div>
            </div>

            {/* Simple vs Advance Mode */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ToggleRight className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Simple mode {isManualModeOn ? "(ON)" : "(OFF — Advance mode is live)"}</h3>
                    <p className="text-xs text-muted-foreground max-w-md">
                      When ON, advertisers launch campaigns with just an app / website / song / video link — no SDK, no API keys. Every campaign is reviewed and approved manually by a Karbali official. Turn OFF to run Advance mode (full API tracking + auto-approval).
                    </p>
                  </div>
                </div>
                <Switch checked={isManualModeOn} onCheckedChange={toggleManualMode} />
              </div>
            </div>

            {/* Gateway Selector */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">Active Payment Gateway</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["paystack", "flutterwave"].map(gw => (
                  <button
                    key={gw}
                    onClick={() => setActiveGateway(gw)}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      activeGateway === gw
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize text-foreground">{gw}</span>
                      {activeGateway === gw ? (
                        <ToggleRight className="h-5 w-5 text-primary" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {gw === "paystack" ? "NGN payments via Paystack" : "NGN & USD payments via Flutterwave"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Paystack Keys */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-foreground mb-4">Paystack API Keys</h3>
              <div className="space-y-4">
                {paystackSettings.map(s => <SettingRow key={s.key} setting={s} />)}
              </div>
            </div>

            {/* Flutterwave Keys */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-foreground mb-4">Flutterwave API Keys</h3>
              <div className="space-y-4">
                {flutterwaveSettings.map(s => <SettingRow key={s.key} setting={s} />)}
              </div>
            </div>

            {/* Platform Settings */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">Platform Settings</h3>
              </div>
              <div className="space-y-4">
                {platformSettings.map(s => <SettingRow key={s.key} setting={s} />)}
              </div>
            </div>
          </>
        )}
      </MotionWrapper>
    </AdminLayout>
  );
}
