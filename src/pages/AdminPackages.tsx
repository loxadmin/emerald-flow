import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Package as PackageIcon } from "lucide-react";

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  category_group_id: string | null;
  category_id: string | null;
  unit_label: string;
  unit_price_usd: number;
  min_units: number;
  max_units: number;
  duration_days: number;
  max_links: number;
  discount_pct: number | null;
  is_active: boolean;
  sort_order: number;
};

type Group = { id: string; name: string; slug: string };
type Category = { id: string; name: string; group_id: string | null };
type Order = {
  id: string; advertiser_id: string; package_name: string; unit_label: string;
  units: number; unit_price_usd: number; total_amount_usd: number; duration_days: number;
  app_links: string[]; payment_method: string; status: string;
  admin_notes: string | null; created_at: string; starts_at: string | null; ends_at: string | null;
};

const emptyForm = {
  name: "", description: "", category_group_id: "", category_id: "",
  unit_label: "daily user", unit_price_usd: "1.2",
  min_units: "500", max_units: "10000", duration_days: "30",
  max_links: "3", discount_pct: "0", is_active: true, sort_order: "0",
};

export default function AdminPackages() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, o, g, c] = await Promise.all([
      supabase.from("ad_packages" as any).select("*").order("sort_order").order("created_at", { ascending: false }),
      supabase.from("package_orders" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("category_groups").select("id,name,slug").order("display_order"),
      supabase.from("categories").select("id,name,group_id").order("name"),
    ]);
    setPackages((p.data as any) || []);
    setOrders((o.data as any) || []);
    setGroups((g.data as any) || []);
    setCategories((c.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p: Pkg) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || "",
      category_group_id: p.category_group_id || "", category_id: p.category_id || "",
      unit_label: p.unit_label, unit_price_usd: String(p.unit_price_usd),
      min_units: String(p.min_units), max_units: String(p.max_units),
      duration_days: String(p.duration_days), max_links: String(p.max_links),
      discount_pct: String(p.discount_pct || 0), is_active: p.is_active, sort_order: String(p.sort_order),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category_group_id: form.category_group_id || null,
      category_id: form.category_id || null,
      unit_label: form.unit_label.trim() || "daily user",
      unit_price_usd: Number(form.unit_price_usd),
      min_units: Number(form.min_units),
      max_units: Number(form.max_units),
      duration_days: Number(form.duration_days),
      max_links: Number(form.max_links),
      discount_pct: Number(form.discount_pct) || 0,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await supabase.from("ad_packages" as any).update(payload).eq("id", editing.id)
      : await supabase.from("ad_packages" as any).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Package updated" : "Package created");
    setOpen(false); load();
  };

  const toggleActive = async (p: Pkg) => {
    await supabase.from("ad_packages" as any).update({ is_active: !p.is_active }).eq("id", p.id);
    load();
  };

  const remove = async (p: Pkg) => {
    if (!confirm(`Delete package "${p.name}"?`)) return;
    await supabase.from("ad_packages" as any).delete().eq("id", p.id);
    load();
  };

  const reviewOrder = async (id: string, approve: boolean) => {
    const notes = prompt(approve ? "Approval notes (optional):" : "Reason for rejection:") || "";
    const { error } = await supabase.rpc("review_package_order" as any, {
      _order_id: id, _approve: approve, _notes: notes,
    });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Order approved" : "Order rejected & refunded");
    load();
  };

  const groupCats = categories.filter((c) => !form.category_group_id || c.group_id === form.category_group_id);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ad Packages</h1>
          <p className="text-sm text-muted-foreground">Pre-priced ad templates advertisers can buy in one click.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New package</Button>
      </div>

      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages">Packages ({packages.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : packages.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              <PackageIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
              No packages yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {packages.map((p) => {
                const group = groups.find((g) => g.id === p.category_group_id);
                const cat = categories.find((c) => c.id === p.category_id);
                return (
                  <div key={p.id} className="rounded-lg border bg-card p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{p.name}</p>
                        {group && <Badge variant="outline">{group.name}</Badge>}
                        {cat && <Badge variant="secondary">{cat.name}</Badge>}
                        {!p.is_active && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        ${p.unit_price_usd}/{p.unit_label} · {p.min_units.toLocaleString()}–{p.max_units.toLocaleString()} units · {p.duration_days} days
                      </p>
                      {p.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          {orders.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No orders yet.</div>
          ) : (
            <div className="grid gap-3">
              {orders.map((o) => (
                <div key={o.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{o.package_name}</p>
                        <Badge variant="outline">{o.status.replace(/_/g, " ")}</Badge>
                        <Badge variant="secondary">{o.payment_method}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {o.units.toLocaleString()} {o.unit_label} · ${o.total_amount_usd} · {o.duration_days} days
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Advertiser: {o.advertiser_id}</p>
                      {o.app_links?.length > 0 && (
                        <ul className="mt-2 text-xs space-y-0.5">
                          {o.app_links.map((l, i) => (
                            <li key={i} className="truncate"><a className="text-primary underline" href={l} target="_blank" rel="noreferrer">{l}</a></li>
                          ))}
                        </ul>
                      )}
                      {o.admin_notes && <p className="mt-2 text-xs text-muted-foreground">Notes: {o.admin_notes}</p>}
                    </div>
                    {o.status === "pending_review" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => reviewOrder(o.id, true)}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => reviewOrder(o.id, false)}>Reject</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit package" : "New package"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 10k daily users for Fintech apps" /></div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ad group</Label>
                <Select value={form.category_group_id} onValueChange={(v) => setForm({ ...form, category_group_id: v, category_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subcategory (optional)</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>{groupCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Unit label</Label><Input value={form.unit_label} onChange={(e) => setForm({ ...form, unit_label: e.target.value })} /></div>
              <div><Label>Unit price (USD)</Label><Input type="number" step="0.01" value={form.unit_price_usd} onChange={(e) => setForm({ ...form, unit_price_usd: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Min units</Label><Input type="number" value={form.min_units} onChange={(e) => setForm({ ...form, min_units: e.target.value })} /></div>
              <div><Label>Max units</Label><Input type="number" value={form.max_units} onChange={(e) => setForm({ ...form, max_units: e.target.value })} /></div>
              <div><Label>Duration (days)</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Max links</Label><Input type="number" value={form.max_links} onChange={(e) => setForm({ ...form, max_links: e.target.value })} /></div>
              <div><Label>Discount %</Label><Input type="number" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })} /></div>
              <div><Label>Sort</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
