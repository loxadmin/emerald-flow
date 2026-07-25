import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Opp = {
  id: string;
  current_brand: string;
  target_brand: string;
  eligible_users: number;
  completion_rate: number;
  estimated_duration_days: number;
  estimated_cost_usd: number;
  category: string | null;
  is_active: boolean;
};

const empty: Partial<Opp> = {
  current_brand: "",
  target_brand: "",
  eligible_users: 0,
  completion_rate: 90,
  estimated_duration_days: 30,
  estimated_cost_usd: 0,
  category: "",
  is_active: true,
};

export default function AdminMigrationOpportunities() {
  const [rows, setRows] = useState<Opp[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Opp>>(empty);

  const load = async () => {
    const { data } = await supabase
      .from("migration_opportunities" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data as any) || []);
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.current_brand || !form.target_brand) return toast.error("Brands required");
    const payload = {
      current_brand: form.current_brand,
      target_brand: form.target_brand,
      eligible_users: Number(form.eligible_users) || 0,
      completion_rate: Number(form.completion_rate) || 0,
      estimated_duration_days: Number(form.estimated_duration_days) || 30,
      estimated_cost_usd: Number(form.estimated_cost_usd) || 0,
      category: form.category || null,
      is_active: form.is_active ?? true,
    };
    if (form.id) {
      const { error } = await supabase.from("migration_opportunities" as any).update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("migration_opportunities" as any).insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved");
    setOpen(false);
    setForm(empty);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete opportunity?")) return;
    const { error } = await supabase.from("migration_opportunities" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Migration opportunities</h1>
            <p className="text-sm text-muted-foreground">
              Curated "brand X users ready to switch to brand Y" pool shown when offline advertisers launch a campaign.
            </p>
          </div>
          <Button
            onClick={() => {
              setForm(empty);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </div>

        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4 flex items-start justify-between gap-4">
              <div className="text-sm space-y-1">
                <p className="font-medium">
                  {r.current_brand} → {r.target_brand}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.eligible_users.toLocaleString()} eligible users · {r.completion_rate}% avg completion · {r.estimated_duration_days}d · ${Number(r.estimated_cost_usd).toFixed(2)}
                  {r.category ? ` · ${r.category}` : ""} {!r.is_active && " · inactive"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setForm(r); setOpen(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => del(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No opportunities yet.</p>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit" : "New"} migration opportunity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Current brand</Label>
                <Input value={form.current_brand || ""} onChange={(e) => setForm({ ...form, current_brand: e.target.value })} />
              </div>
              <div>
                <Label>Target brand</Label>
                <Input value={form.target_brand || ""} onChange={(e) => setForm({ ...form, target_brand: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Eligible users</Label>
                <Input type="number" value={form.eligible_users ?? 0} onChange={(e) => setForm({ ...form, eligible_users: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Avg completion (%)</Label>
                <Input type="number" value={form.completion_rate ?? 0} onChange={(e) => setForm({ ...form, completion_rate: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input type="number" value={form.estimated_duration_days ?? 30} onChange={(e) => setForm({ ...form, estimated_duration_days: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Est. cost (USD)</Label>
                <Input type="number" value={form.estimated_cost_usd ?? 0} onChange={(e) => setForm({ ...form, estimated_cost_usd: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Category (optional)</Label>
              <Input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Fintech, FMCG, Streaming" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
