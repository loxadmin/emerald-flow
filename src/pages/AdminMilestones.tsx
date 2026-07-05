import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Flag } from "lucide-react";

type Milestone = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  default_order: number;
  is_active: boolean;
};

const empty = { name: "", slug: "", description: "", default_order: "10", is_active: true };

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export default function AdminMilestones() {
  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("milestones" as any).select("*").order("default_order");
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (m: Milestone) => {
    setEditing(m);
    setForm({
      name: m.name, slug: m.slug, description: m.description || "",
      default_order: String(m.default_order), is_active: m.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      slug: (form.slug.trim() || slugify(form.name)).slice(0, 60),
      description: form.description.trim() || null,
      default_order: Number(form.default_order) || 0,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from("milestones" as any).update(payload).eq("id", editing.id)
      : await supabase.from("milestones" as any).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Milestone updated" : "Milestone created");
    setOpen(false); load();
  };

  const toggle = async (m: Milestone) => {
    await supabase.from("milestones" as any).update({ is_active: !m.is_active }).eq("id", m.id);
    load();
  };
  const remove = async (m: Milestone) => {
    if (!confirm(`Delete milestone "${m.name}"? Packages using it will fail.`)) return;
    const { error } = await supabase.from("milestones" as any).delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Milestones</h1>
          <p className="text-sm text-muted-foreground">Global catalog of user milestones (install, signup, engagement, deposit, sale…).</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New milestone</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          <Flag className="mx-auto mb-2 h-8 w-8 opacity-40" />
          No milestones yet.
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map((m) => (
            <div key={m.id} className="rounded-lg border bg-card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{m.name}</p>
                  <Badge variant="outline">order {m.default_order}</Badge>
                  <Badge variant="secondary" className="font-mono text-[10px]">{m.slug}</Badge>
                  {!m.is_active && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                </div>
                {m.description && <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={m.is_active} onCheckedChange={() => toggle(m)} />
                <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit milestone" : "New milestone"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name</Label>
              <Input value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value,
                  slug: editing ? form.slug : slugify(e.target.value) })} />
            </div>
            <div><Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
              <p className="mt-1 text-xs text-muted-foreground">Unique identifier, lowercase.</p>
            </div>
            <div><Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Default order</Label>
                <Input type="number" value={form.default_order} onChange={(e) => setForm({ ...form, default_order: e.target.value })} />
                <p className="mt-1 text-xs text-muted-foreground">Lower = earlier in the funnel.</p>
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
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
