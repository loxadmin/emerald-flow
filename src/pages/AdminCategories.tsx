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
import { Plus, Trash2, Handshake, Save, Pencil, X, Check, Music, MonitorPlay, Globe, Smartphone, ShoppingBag, Wrench, Home, ChevronDown, ChevronRight } from "lucide-react";

interface Category {
  id: string; name: string; description: string | null; is_active: boolean; is_partnership: boolean;
}

const DEFAULT_CATEGORY_EVENTS = ["download", "signup", "purchase"];

type AdType = "engagement" | "performance" | "commerce";
type Subtype = "musician" | "youtuber" | "app" | "website" | "ecommerce" | "service" | "real_estate";

interface SubtypeInfo {
  id: Subtype;
  label: string;
  icon: React.ElementType;
  adType: AdType;
}

const AD_TYPE_LABELS: Record<AdType, { label: string; description: string }> = {
  engagement: { label: "Engagement Ads", description: "Musicians & YouTubers — interactive offerwalls" },
  performance: { label: "Performance Ads", description: "App & Website owners — downloads, signups, purchases" },
  commerce: { label: "Commerce Ads", description: "E-commerce & Real Estate — sales tracking" },
};

const SUBTYPES: SubtypeInfo[] = [
  { id: "musician", label: "Musician", icon: Music, adType: "engagement" },
  { id: "youtuber", label: "YouTuber", icon: MonitorPlay, adType: "engagement" },
  { id: "app", label: "App Owner", icon: Smartphone, adType: "performance" },
  { id: "website", label: "Website Owner", icon: Globe, adType: "performance" },
  { id: "ecommerce", label: "E-commerce Vendor", icon: ShoppingBag, adType: "commerce" },
  { id: "service", label: "Service Provider", icon: Wrench, adType: "commerce" },
  { id: "real_estate", label: "Real Estate", icon: Home, adType: "commerce" },
];

function parseCategoryEvents(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || "[]");
    if (Array.isArray(parsed)) {
      const sanitized = parsed.filter((event): event is string => DEFAULT_CATEGORY_EVENTS.includes(String(event)));
      return sanitized.length > 0 ? sanitized : DEFAULT_CATEGORY_EVENTS;
    }
  } catch { /* empty */ }
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [expandedTypes, setExpandedTypes] = useState<Set<AdType>>(new Set(["engagement", "performance", "commerce"]));

  // Count how many advertisers use each category
  const [advertiserCounts, setAdvertiserCounts] = useState<Record<string, number>>({});

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

      // Fetch advertiser counts per category
      const { data: acData } = await supabase
        .from("advertiser_categories")
        .select("category_id");
      const counts: Record<string, number> = {};
      (acData || []).forEach((ac: any) => {
        counts[ac.category_id] = (counts[ac.category_id] || 0) + 1;
      });
      setAdvertiserCounts(counts);
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
    else { toast.success("Subcategory created"); setNewName(""); setNewDesc(""); setNewActive(true); setNewPartnership(false); fetchCategories(); }
    setAdding(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("categories").update({ is_active: !current, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    if (advertiserCounts[id] > 0) {
      toast.error(`Cannot delete — ${advertiserCounts[id]} advertiser(s) are using this subcategory`);
      return;
    }
    if (!confirm("Delete this subcategory?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetchCategories(); }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || "");
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const { error } = await supabase.from("categories").update({
      name: editName.trim(),
      description: editDesc.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", editingId);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); setEditingId(null); fetchCategories(); }
  };

  const toggleCategoryEvent = (categoryId: string, eventType: string, checked: boolean) => {
    setCategoryEvents((current) => {
      const nextEvents = new Set(current[categoryId] || DEFAULT_CATEGORY_EVENTS);
      if (checked) nextEvents.add(eventType);
      else nextEvents.delete(eventType);
      return { ...current, [categoryId]: nextEvents.size > 0 ? Array.from(nextEvents) : [eventType] };
    });
  };

  const saveCategoryEvents = async (category: Category) => {
    setSavingEvents(category.id);
    const key = `category_events:${category.id}`;
    const value = JSON.stringify(categoryEvents[category.id] || DEFAULT_CATEGORY_EVENTS);

    const { data: existingSetting } = await supabase
      .from("admin_settings").select("id").eq("key", key).maybeSingle();

    const operation = existingSetting
      ? supabase.from("admin_settings").update({ value, updated_at: new Date().toISOString() }).eq("id", existingSetting.id)
      : supabase.from("admin_settings").insert({ key, value, description: `Allowed milestones for ${category.name}` });

    const { error } = await operation;
    setSavingEvents(null);
    if (error) toast.error(error.message);
    else toast.success("Milestone options updated");
  };

  const toggleExpanded = (type: AdType) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  // Group categories — categories are subcategories that users pick within their subtype
  // They aren't linked to ad types in the DB, so we show them all under a flat "Subcategories" section
  // The ad type hierarchy (Engagement > Musician/YouTuber, etc.) is defined by enum, not the categories table

  return (
    <AdminLayout>
      <MotionWrapper className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Categories & Subtypes</h1>
          <p className="text-sm text-muted-foreground">Manage the advertiser type hierarchy and business subcategories</p>
        </div>

        {/* Ad Type Hierarchy (read-only, from enum) */}
        <div className="space-y-3">
          {(["engagement", "performance", "commerce"] as AdType[]).map((adType) => {
            const info = AD_TYPE_LABELS[adType];
            const subtypes = SUBTYPES.filter((s) => s.adType === adType);
            const isExpanded = expandedTypes.has(adType);

            return (
              <MotionWrapper key={adType} delay={0.05}>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => toggleExpanded(adType)}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        {adType === "engagement" && <Music className="h-4 w-4 text-primary" />}
                        {adType === "performance" && <Globe className="h-4 w-4 text-primary" />}
                        {adType === "commerce" && <ShoppingBag className="h-4 w-4 text-primary" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{info.label}</p>
                        <p className="text-xs text-muted-foreground">{info.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{subtypes.length} subtypes</Badge>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 pt-2 space-y-2">
                      {subtypes.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
                          <sub.icon className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{sub.label}</p>
                            <p className="text-[11px] text-muted-foreground">Subtype: <code className="text-primary/80">{sub.id}</code></p>
                          </div>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">System-defined</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </MotionWrapper>
            );
          })}
        </div>

        {/* Business Subcategories (from categories table — user-selectable during onboarding) */}
        <MotionWrapper delay={0.15}>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Business Subcategories</h3>
                <p className="text-xs text-muted-foreground">These are the subcategories advertisers select during onboarding (e.g. Fintech, Banking, Fashion)</p>
              </div>
            </div>

            {/* Add new */}
            <div className="rounded-lg border border-dashed border-border p-4 mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Add Subcategory</p>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} placeholder="e.g. Fintech, Fashion, Real Estate" className="text-sm" />
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} maxLength={255} placeholder="Optional description" className="text-sm" />
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-3">
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

            {/* List */}
            {loading ? (
              <div className="flex justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : categories.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">No subcategories created yet</p>
            ) : (
              <div className="divide-y divide-border">
                {categories.map((cat) => (
                  <div key={cat.id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {editingId === cat.id ? (
                          <div className="flex items-center gap-2">
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm max-w-[200px]" />
                            <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-8 text-sm max-w-[200px]" placeholder="Description" />
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary" onClick={saveEdit}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{cat.name}</p>
                              {cat.is_partnership && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/20 bg-primary/5">
                                  <Handshake className="h-2.5 w-2.5 mr-0.5" /> Partnership
                                </Badge>
                              )}
                              {advertiserCounts[cat.id] > 0 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {advertiserCounts[cat.id]} advertiser{advertiserCounts[cat.id] > 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
                            {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cat.is_active ? "text-primary border-primary/20" : "text-amber-600 border-amber-500/20"}`}>
                          {cat.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Switch checked={cat.is_active} onCheckedChange={() => toggleActive(cat.id, cat.is_active)} />
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startEdit(cat)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => deleteCategory(cat.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Milestone event controls */}
                    <div className="flex flex-wrap items-center gap-2 pl-0.5">
                      <span className="text-[11px] text-muted-foreground mr-1">Milestones:</span>
                      {DEFAULT_CATEGORY_EVENTS.map((eventType) => {
                        const checked = (categoryEvents[cat.id] || DEFAULT_CATEGORY_EVENTS).includes(eventType);
                        return (
                          <label key={eventType} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground cursor-pointer hover:bg-accent/30 transition-colors">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => toggleCategoryEvent(cat.id, eventType, value === true)}
                            />
                            <span className="capitalize">{eventType}</span>
                          </label>
                        );
                      })}
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => saveCategoryEvents(cat)} disabled={savingEvents === cat.id}>
                        <Save className="mr-1 h-3 w-3" /> {savingEvents === cat.id ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </MotionWrapper>
      </MotionWrapper>
    </AdminLayout>
  );
}