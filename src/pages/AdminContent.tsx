import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface SiteContent {
  id: string;
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  is_visible: boolean;
  sort_order: number;
}

export default function AdminContent() {
  const [sections, setSections] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("*")
        .order("sort_order");
      if (data) setSections(data as SiteContent[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const updateSection = (id: string, field: string, value: string | boolean) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const saveSection = async (section: SiteContent) => {
    setSaving(section.id);
    const { error } = await supabase
      .from("site_content")
      .update({
        title: section.title,
        subtitle: section.subtitle,
        content: section.content,
        is_visible: section.is_visible,
        updated_at: new Date().toISOString(),
      })
      .eq("id", section.id);
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success(`${section.section_key} updated`);
  };

  return (
    <AdminLayout>
      <MotionWrapper className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Site Content</h1>
          <p className="text-muted-foreground">Edit landing page sections</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          sections.map((section) => (
            <GlassCard key={section.id} variant="strong">
              <GlassCardHeader className="flex flex-row items-center justify-between">
                <GlassCardTitle className="capitalize">
                  {section.section_key.replace(/_/g, " ")}
                </GlassCardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Visible</Label>
                  <Switch
                    checked={section.is_visible}
                    onCheckedChange={(v) => updateSection(section.id, "is_visible", v)}
                  />
                </div>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Title</Label>
                  <GlassInput
                    value={section.title || ""}
                    onChange={(e) => updateSection(section.id, "title", e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Subtitle</Label>
                  <GlassInput
                    value={section.subtitle || ""}
                    onChange={(e) => updateSection(section.id, "subtitle", e.target.value)}
                    maxLength={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Content</Label>
                  <textarea
                    className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground backdrop-blur-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 min-h-[100px] resize-y"
                    value={section.content || ""}
                    onChange={(e) => updateSection(section.id, "content", e.target.value)}
                    maxLength={2000}
                  />
                </div>
                <GlassButton
                  size="sm"
                  variant="glow"
                  onClick={() => saveSection(section)}
                  disabled={saving === section.id}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving === section.id ? "Saving..." : "Save"}
                </GlassButton>
              </GlassCardContent>
            </GlassCard>
          ))
        )}
      </MotionWrapper>
    </AdminLayout>
  );
}
