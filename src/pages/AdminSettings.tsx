import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

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
    const { error } = await supabase
      .from("admin_settings")
      .update({ value: editValues[key], updated_at: new Date().toISOString() })
      .eq("key", key);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(`${key} updated`);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-muted-foreground">Configure API keys and platform options</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Payment Gateway Keys</CardTitle>
                <CardDescription>Configure Stripe and Paystack API keys for billing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings
                  .filter(s => s.key.includes("stripe") || s.key.includes("paystack"))
                  .map((setting) => (
                    <div key={setting.key} className="space-y-2">
                      <Label>{setting.description || setting.key}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={editValues[setting.key] || ""}
                          onChange={(e) => setEditValues({ ...editValues, [setting.key]: e.target.value })}
                          type={setting.key.includes("secret") ? "password" : "text"}
                          maxLength={500}
                        />
                        <Button size="sm" onClick={() => saveSetting(setting.key)} disabled={saving}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings
                  .filter(s => !s.key.includes("stripe") && !s.key.includes("paystack"))
                  .map((setting) => (
                    <div key={setting.key} className="space-y-2">
                      <Label>{setting.description || setting.key}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={editValues[setting.key] || ""}
                          onChange={(e) => setEditValues({ ...editValues, [setting.key]: e.target.value })}
                          maxLength={500}
                        />
                        <Button size="sm" onClick={() => saveSetting(setting.key)} disabled={saving}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
