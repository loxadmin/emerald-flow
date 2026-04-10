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
import { Plus, Trash2, Handshake, Save, Pencil, X, Check, Layers3 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_partnership: boolean;
}

const DEFAULT_CATEGORY_EVENTS = ["download", "signup", "purchase"];
const CORE_CATEGORY_META: Record<string, string> = {
  "Engagement Ads": "Top-level system category for musicians and YouTubers.",
  "Performance Ads": "Top-level system category for app and website owners.",
  "Commerce Ads": "Top-level system category for vendors and sales-driven businesses.",
};
const CORE_CATEGORY_NAMES = Object.keys(CORE_CATEGORY_META);

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
  const [advertiserCounts, setAdvertiserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [savingEvents, setSavingEvents] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [newPartnership, setNewPartnership] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("name");
    const nextCategories = (data as Category[]) || [];
    setCategories(nextCategories);

    if (nextCategories.length > 0) {
      const keys = nextCategories.map((category) => `category_events:${category.id}`);
      const [{ data: settingsData }, { data: acData }] = await Promise.all([
        supabase.from("admin_settings").select("key, value").in("key", keys),
        supabase.from("advertiser_categories").select("category_id"),
      ]);

      const eventMap: Record<string, string[]> = Object.fromEntries(
        nextCategories.map((category) => [category.id, [...DEFAULT_CATEGORY_EVENTS]])
      );

      (settingsData || []).forEach((setting) => {
        const categoryId = setting.key.replace("category_events:", "");
        eventMap[categoryId] = parseCategoryEvents(setting.value);
      });
      setCategoryEvents(eventMap);

      const counts: Record<string, number> = {};
      (acData || []).forEach((ac: any) => {
        counts[ac.category_id] = (counts[ac.category_id] || 0) + 1;
      });
      setAdvertiserCounts(counts);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const coreCategories = categories.filter((category) => CORE_CATEGORY_NAMES.includes(category.name));
  const subcategories = categories.filter((category) => !CORE_CATEGORY_NAMES.includes(category.name));

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDesc(category.description || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDesc("");
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const { error } = await supabase
      .from("categories")
      .update({ name: editName.trim(), description: editDesc.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", editingId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Category updated");
    cancelEdit();
    fetchCategories();
  };

  const addCategory = async () => {
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }

    setAdding(true);
    const { error } = await supabase.from("categories").insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      is_active: newActive,
      is_partnership: newPartnership,
    } as any);

    setAdding(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Subcategory created");
    setNewName("");
    setNewDesc("");
    setNewActive(true);
    setNewPartnership(false);
    fetchCategories();
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("categories")
      .update({ is_active: !current, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    if ((advertiserCounts[id] || 0) > 0) {
      toast.error(`Cannot delete — ${advertiserCounts[id]} advertiser(s) are using this subcategory`);
      return;
    }
    if (!confirm("Delete this subcategory?")) return;

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Subcategory deleted");
    fetchCategories();
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
      : supabase.from("admin_settings").insert({ key, value, description: `Allowed milestones for ${category.name}` });

    const { error } = await operation;
    setSavingEvents(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Category options updated");
  };

  const renderMilestones = (category: Category) => (
    <div className="flex flex-wrap items-center gap-2">
      {DEFAULT_CATEGORY_EVENTS.map((eventType) => {
        const checked = (categoryEvents[category.id] || DEFAULT_CATEGORY_EVENTS).includes(eventType);
        return (
          <label key={eventType} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">
            <Checkbox checked={checked} onCheckedChange={(value) => toggleCategoryEvent(category.id, eventType, value === true)} />
            <span className="capitalize">{eventType}</span>
          </label>
        );
      })}
      <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => saveCategoryEvents(category)} disabled={savingEvents === category.id}>
        <Save className="mr-1 h-3 w-3" /> {savingEvents === category.id ? "Saving..." : "Save options"}
      </Button>
    </div>
  );

  return (
    <AdminLayout>
      <MotionWrapper className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground">System categories and business subcategories are now separated.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Core Categories</h3>
            <p className="text-xs text-muted-foreground">These are the top-level system categories used in onboarding. They stay separate from business subcategories.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : coreCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No core categories found.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {coreCategories.map((category) => (
                <div key={category.id} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{category.name}</p>
                        <Badge variant="outline" className="text-[10px]">System</Badge>
                        {category.is_partnership && (
                          <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                            <Handshake className="mr-1 h-3 w-3" /> Partnership
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{category.description || CORE_CATEGORY_META[category.name] || "Top-level platform category"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] ${category.is_active ? "text-primary border-primary/20" : "text-amber-600 border-amber-500/20"}`}>
                        {category.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Switch checked={category.is_active} onCheckedChange={() => toggleActive(category.id, category.is_active)} />
                    </div>
                  </div>
                  {renderMilestones(category)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Business Subcategories</h3>
              <p className="text-xs text-muted-foreground">These are the selectable business niches like Fintech, Banks & MFBs, Product Vendors, Real Estate, and others.</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              <Layers3 className="mr-1 h-3 w-3" /> {subcategories.length} subcategories
            </Badge>
          </div>

          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">Add Subcategory</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} placeholder="e.g. Fintech, Banks & MFBs, Product Vendors" />
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} maxLength={255} placeholder="Optional description" />
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={newActive} onCheckedChange={setNewActive} />
                  <Label className="text-xs text-muted-foreground">{newActive ? "Active" : "Inactive"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newPartnership} onCheckedChange={setNewPartnership} />
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Handshake className="h-3 w-3" /> Partnership</Label>
                </div>
              </div>
              <Button size="sm" onClick={addCategory} disabled={adding}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : subcategories.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No business subcategories created yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {subcategories.map((category) => (
                <div key={category.id} className="py-4 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      {editingId === category.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 max-w-[220px]" />
                          <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-8 max-w-[260px]" placeholder="Description" />
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{category.name}</p>
                            {category.is_partnership && (
                              <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                                <Handshake className="mr-1 h-3 w-3" /> Partnership
                              </Badge>
                            )}
                            {(advertiserCounts[category.id] || 0) > 0 && (
                              <Badge variant="outline" className="text-[10px]">{advertiserCounts[category.id]} advertiser{advertiserCounts[category.id] > 1 ? "s" : ""}</Badge>
                            )}
                          </div>
                          {category.description && <p className="mt-1 text-xs text-muted-foreground">{category.description}</p>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${category.is_active ? "text-primary border-primary/20" : "text-amber-600 border-amber-500/20"}`}>
                        {category.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Switch checked={category.is_active} onCheckedChange={() => toggleActive(category.id, category.is_active)} />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startEdit(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => deleteCategory(category.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {renderMilestones(category)}
                </div>
              ))}
            </div>
          )}
        </div>
      </MotionWrapper>
    </AdminLayout>
  );
}
