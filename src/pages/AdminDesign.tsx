import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Check, Layout } from "lucide-react";
import { friendlyError } from "@/lib/errors";

const designs = [
  { id: "default", name: "Default", desc: "Left-aligned hero with bottom copy, cinematic fade" },
  { id: "variant1", name: "Centered Bold", desc: "Center-aligned with oversized typography and tracking label" },
  { id: "variant2", name: "Split Cards", desc: "Left text with floating feature cards on the right" },
  { id: "variant3", name: "Video Window", desc: "Centered video frame with text below, dark background" },
  { id: "variant4", name: "Diagonal Split", desc: "Diagonal video clip with stats row, editorial style" },
  { id: "variant5", name: "Grid Overlay", desc: "Right-aligned copy with futuristic grid overlay on video" },
];

export default function AdminDesign() {
  const [current, setCurrent] = useState("default");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "landing_design")
        .maybeSingle();
      if (data?.value) setCurrent(data.value);
      setLoading(false);
    };
    fetch();
  }, []);

  const selectDesign = async (id: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("admin_settings")
      .upsert({ key: "landing_design", value: id, description: "Landing page hero design variant", updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast.error(friendlyError(error));
    } else {
      setCurrent(id);
      toast.success(`Design changed to "${designs.find(d => d.id === id)?.name}"`);
    }
  };

  return (
    <AdminLayout>
      <MotionWrapper className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Landing Page Design</h1>
          <p className="text-muted-foreground">Choose the hero section layout for the public landing page</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map((d) => (
              <GlassCard
                key={d.id}
                variant="strong"
                className={`cursor-pointer transition-all duration-300 ${
                  current === d.id
                    ? "ring-2 ring-primary shadow-[0_0_20px_hsl(var(--primary)/0.2)]"
                    : "hover:ring-1 hover:ring-primary/30"
                }`}
                onClick={() => !saving && selectDesign(d.id)}
              >
                <GlassCardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <GlassCardTitle className="text-base">{d.name}</GlassCardTitle>
                    {current === d.id && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-muted/50 border border-border/30">
                    <Layout className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-xs text-muted-foreground">{d.desc}</p>
                </GlassCardContent>
              </GlassCard>
            ))}
          </div>
        )}
      </MotionWrapper>
    </AdminLayout>
  );
}
