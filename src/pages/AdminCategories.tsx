import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Plus, Trash2, Handshake, Download, UserPlus, CreditCard } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Category {
  id: string; name: string; description: string | null; is_active: boolean; is_partnership: boolean;
  allow_download: boolean; allow_signup: boolean; allow_purchase: boolean;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [newPartnership, setNewPartnership] = useState(false);
  const [newAllowDownload, setNewAllowDownload] = useState(true);
  const [newAllowSignup, setNewAllowSignup] = useState(true);
  const [newAllowPurchase, setNewAllowPurchase] = useState(true);
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
      is_partnership: newPartnership,
      allow_download: newAllowDownload,
      allow_signup: newAllowSignup,
      allow_purchase: newAllowPurchase,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Category created");
      setNewName(""); setNewDesc("");
      setNewActive(true); setNewPartnership(false);
      setNewAllowDownload(true); setNewAllowSignup(true); setNewAllowPurchase(true);
      fetchCategories();
    }
    setAdding(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("categories").update({ is_active: !current, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else fetchCategories();
  };

  const togglePermission = async (id: string, field: string, current: boolean) => {
    const { error } = await supabase.from("categories").update({ [field]: !current, updated_at: new Date().toISOString() } as any).eq("id", id);
    if (error) toast.error(error.message); else fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetchCategories(); }
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
              <div className="flex items-center gap-2">
                <Checkbox id="newDl" checked={newAllowDownload} onCheckedChange={(c) => setNewAllowDownload(!!c)} />
                <Label htmlFor="newDl" className="text-xs text-muted-foreground">Download</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="newSu" checked={newAllowSignup} onCheckedChange={(c) => setNewAllowSignup(!!c)} />
                <Label htmlFor="newSu" className="text-xs text-muted-foreground">Signup</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="newPu" checked={newAllowPurchase} onCheckedChange={(c) => setNewAllowPurchase(!!c)} />
                <Label htmlFor="newPu" className="text-xs text-muted-foreground">Sales</Label>
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
                  <div key={cat.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{cat.name}</p>
                        {cat.is_partnership && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-500 border-blue-500/20 bg-blue-500/5">
                            <Handshake className="h-2.5 w-2.5 mr-0.5" /> Partnership
                          </Badge>
                        )}
                      </div>
                      {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                      <div className="flex gap-4 mt-2">
                        <button onClick={() => togglePermission(cat.id, "allow_download", cat.allow_download)} className={`flex items-center gap-1 text-[10px] uppercase font-bold transition-colors ${cat.allow_download ? "text-primary" : "text-muted-foreground/40"}`}>
                          <Download className="h-2.5 w-2.5" /> Download
                        </button>
                        <button onClick={() => togglePermission(cat.id, "allow_signup", cat.allow_signup)} className={`flex items-center gap-1 text-[10px] uppercase font-bold transition-colors ${cat.allow_signup ? "text-primary" : "text-muted-foreground/40"}`}>
                          <UserPlus className="h-2.5 w-2.5" /> Signup
                        </button>
                        <button onClick={() => togglePermission(cat.id, "allow_purchase", cat.allow_purchase)} className={`flex items-center gap-1 text-[10px] uppercase font-bold transition-colors ${cat.allow_purchase ? "text-primary" : "text-muted-foreground/40"}`}>
                          <CreditCard className="h-2.5 w-2.5" /> Sales
                        </button>
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
