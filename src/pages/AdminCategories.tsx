import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Plus, Trash2, Handshake, Save } from "lucide-react";

interface Category {
  id: string; name: string; description: string | null; is_active: boolean; is_partnership: boolean;
}

const DEFAULT_CATEGORY_EVENTS = ["download", "signup", "purchase"];

function parseCategoryEvents(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || "[]");
    if (Array.isArray(parsed)) {
      const sanitized = parsed.filter((event): event is string => DEFAULT_CATEGORY_EVENTS.includes(String(event)));
      return sanitized.length > 0 ? sanitized : DEFAULT_CATEGORY_EVENTS;
    }
  } catch {
    return DEFAULT_CATEGORY_EVENTS;
  }

  return DEFAULT_CATEGORY_EVENTS;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryEvents, setCategoryEvents] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [newPartnership, setNewPartnership] = useState(false);
  const [adding, setAdding] = useState(false);
  const [savingEvents, setSavingEvents] = useState<string | null>(null);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    const nextCategories = (data as Category[]) || [];
    setCategories(nextCategories);

    if (nextCategories.length > 0) {
      const keys = nextCategories.map((category) => `category_events:${category.id}`);
      const { data: settingsData } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", keys);

      const eventMap: Record<string, string[]> = Object.fromEntries(
        nextCategories.map((category) => [category.id, [...DEFAULT_CATEGORY_EVENTS]])
      );

      (settingsData || []).forEach((setting) => {
        const categoryId = setting.key.replace("category_events:", "");
        eventMap[categoryId] = parseCategoryEvents(setting.value);
      });

      setCategoryEvents(eventMap);
    }

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
      is_partnership: newPartnership,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success("Category created"); setNewName(""); setNewDesc(""); setNewActive(true); setNewPartnership(false); fetchCategories(); }
    setAdding(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("categories").update({ is_active: !current, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetchCategories(); }
  };

  const toggleCategoryEvent = (categoryId: string, eventType: string, checked: boolean) => {
    setCategoryEvents((current) => {
      const nextEvents = new Set(current[categoryId] || DEFAULT_CATEGORY_EVENTS);
      if (checked) nextEvents.add(eventType);
      else nextEvents.delete(eventType);
      return {
        ...current,
        [categoryId]: nextEvents.size > 0 ? Array.from(nextEvents) : [eventType],
      };
    });
  };

  const saveCategoryEvents = async (category: Category) => {
    setSavingEvents(category.id);
    const key = `category_events:${category.id}`;
    const value = JSON.stringify(categoryEvents[category.id] || DEFAULT_CATEGORY_EVENTS);

    const { data: existingSetting } = await supabase
      .from("admin_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    const operation = existingSetting
      ? supabase.from("admin_settings").update({ value, updated_at: new Date().toISOString() }).eq("id", existingSetting.id)
      : supabase.from("admin_settings").insert({ key, value, description: `Allowed campaign milestones for ${category.name}` });

    const { error } = await operation;
    setSavingEvents(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Category promotion options updated");
  };

  return (
    <AdminLayout>
      <MotionWrapper className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground">Manage advertiser business categories</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-medium text-foreground mb-4">Add Category</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} placeholder="e.g. E-Commerce" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} maxLength={255} placeholder="Optional description" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={newActive} onCheckedChange={setNewActive} />
                <Label className="text-xs text-muted-foreground">{newActive ? "Active" : "Inactive"}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newPartnership} onCheckedChange={setNewPartnership} />
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Handshake className="h-3 w-3" /> Partnership
                </Label>
              </div>
            </div>
            <Button size="sm" onClick={addCategory} disabled={adding}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="p-5 pb-3">
            <h3 className="text-sm font-medium text-foreground">All Categories</h3>
          </div>
          <div className="px-5 pb-5">
            {loading ? (
              <div className="flex justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : categories.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">No categories created yet</p>
            ) : (
              <div className="divide-y divide-border">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{cat.name}</p>
                        {cat.is_partnership && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/20 bg-primary/5">
                            <Handshake className="h-2.5 w-2.5 mr-0.5" /> Partnership
                          </Badge>
                        )}
                      </div>
                      {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        {DEFAULT_CATEGORY_EVENTS.map((eventType) => {
                          const checked = (categoryEvents[cat.id] || DEFAULT_CATEGORY_EVENTS).includes(eventType);
                          return (
                            <label key={eventType} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => toggleCategoryEvent(cat.id, eventType, value === true)}
                              />
                              <span className="capitalize">{eventType}</span>
                            </label>
                          );
                        })}
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => saveCategoryEvents(cat)} disabled={savingEvents === cat.id}>
                          <Save className="mr-1 h-3 w-3" /> {savingEvents === cat.id ? "Saving..." : "Save options"}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cat.is_active ? "text-primary border-primary/20" : "text-amber-600 border-amber-500/20"}`}>
                        {cat.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Switch checked={cat.is_active} onCheckedChange={() => toggleActive(cat.id, cat.is_active)} />
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteCategory(cat.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </MotionWrapper>
    </AdminLayout>
  );
}
