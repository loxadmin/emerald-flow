import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories((data as Category[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const addCategory = async () => {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    setAdding(true);
    const { error } = await supabase.from("categories").insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      is_active: newActive,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Category created");
      setNewName("");
      setNewDesc("");
      setNewActive(true);
      fetchCategories();
    }
    setAdding(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("categories").update({ is_active: !current, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchCategories(); }
  };

  return (
    <AdminLayout>
      <MotionWrapper className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Categories</h1>
          <p className="text-muted-foreground">Manage advertiser business categories</p>
        </div>

        {/* Add New */}
        <GlassCard variant="strong">
          <GlassCardHeader><GlassCardTitle>Add Category</GlassCardTitle></GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Name *</Label>
                <GlassInput value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} placeholder="e.g. E-Commerce" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Description</Label>
                <GlassInput value={newDesc} onChange={(e) => setNewDesc(e.target.value)} maxLength={255} placeholder="Optional description" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={newActive} onCheckedChange={setNewActive} />
                <Label className="text-sm text-muted-foreground">{newActive ? "Active (free access)" : "Inactive (requires payment)"}</Label>
              </div>
              <GlassButton variant="glow" size="sm" onClick={addCategory} disabled={adding}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </GlassButton>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* List */}
        <GlassCard variant="strong">
          <GlassCardHeader><GlassCardTitle>All Categories</GlassCardTitle></GlassCardHeader>
          <GlassCardContent>
            {loading ? (
              <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : categories.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No categories created yet</p>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                    <div>
                      <p className="font-medium text-foreground">{cat.name}</p>
                      {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={cat.is_active ? "border-primary/30 bg-primary/10 text-primary" : "border-warning/30 bg-warning/10 text-warning"}>
                        {cat.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Switch checked={cat.is_active} onCheckedChange={() => toggleActive(cat.id, cat.is_active)} />
                      <GlassButton variant="destructive" size="sm" onClick={() => deleteCategory(cat.id)}>
                        <Trash2 className="h-4 w-4" />
                      </GlassButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      </MotionWrapper>
    </AdminLayout>
  );
}
