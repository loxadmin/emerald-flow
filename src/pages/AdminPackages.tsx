import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Package as PackageIcon } from "lucide-react";

import { SUBTYPES, subtypesByGroup, GROUP_LABELS, subtypeLabel, type AdvertiserSubtype } from "@/lib/advertiser-subtypes";

type Pkg = {
  id: string; name: string; description: string | null;
  category_group_id: string | null; category_id: string | null;
  advertiser_subtypes: AdvertiserSubtype[] | null;
  min_units: number; max_units: number;
  duration_options: number[]; platform_support: string[];
  is_active: boolean; sort_order: number;
};
type Group = { id: string; name: string; slug: string };
type Category = { id: string; name: string; group_id: string | null };
type Milestone = { id: string; name: string; slug: string; default_order: number; is_active: boolean; is_commission_based: boolean };
type PkgMilestone = {
  id?: string; milestone_id: string; step_order: number;
  pricing_type: "flat" | "commission_pct";
  price_usd: number | null;
  commission_pct: number | null;
};
type Order = {
  id: string; advertiser_id: string; package_name: string;
  units: number; total_amount_usd: number; duration_days: number;
  app_links: string[]; payment_method: string; status: string;
  platform: string | null; selected_milestone_ids: string[] | null;
  milestone_breakdown: any; admin_notes: string | null; created_at: string;
};

const DURATION_PRESETS = [7, 14, 30, 60, 90, 180, 365];
const SUBTYPE_GROUPS = subtypesByGroup();
const emptyForm = {
  name: "", description: "",
  advertiser_subtypes: [] as AdvertiserSubtype[],
  min_units: "500", max_units: "10000",
  duration_options: [30] as number[],
  platform_support: ["mobile"] as string[],
  is_active: true, sort_order: "0",
};


export default function AdminPackages() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [pkgMilestones, setPkgMilestones] = useState<Record<string, PkgMilestone[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState<PkgMilestone[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, o, g, c, m, pm] = await Promise.all([
      supabase.from("ad_packages" as any).select("*").order("sort_order").order("created_at", { ascending: false }),
      supabase.from("package_orders" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("category_groups").select("id,name,slug").order("display_order"),
      supabase.from("categories").select("id,name,group_id").order("name"),
      supabase.from("milestones" as any).select("*").eq("is_active", true).order("default_order"),
      supabase.from("package_milestones" as any).select("*"),
    ]);
    setPackages((p.data as any) || []);
    setOrders((o.data as any) || []);
    setGroups((g.data as any) || []);
    setCategories((c.data as any) || []);
    setMilestones((m.data as any) || []);
    const byPkg: Record<string, PkgMilestone[]> = {};
    for (const r of ((pm.data as any) || [])) {
      (byPkg[r.package_id] ||= []).push({
        id: r.id, milestone_id: r.milestone_id, step_order: r.step_order,
        pricing_type: (r.pricing_type || "flat") as "flat" | "commission_pct",
        price_usd: r.price_usd != null ? Number(r.price_usd) : null,
        commission_pct: r.commission_pct != null ? Number(r.commission_pct) : null,
      });
    }
    for (const k of Object.keys(byPkg)) byPkg[k].sort((a, b) => a.step_order - b.step_order);
    setPkgMilestones(byPkg);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null); setForm(emptyForm); setRows([]); setOpen(true);
  };
  const openEdit = (p: Pkg) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || "",
      advertiser_subtypes: (p.advertiser_subtypes || []) as AdvertiserSubtype[],
      min_units: String(p.min_units), max_units: String(p.max_units),
      duration_options: p.duration_options || [30],
      platform_support: p.platform_support || ["mobile", "web"],
      is_active: p.is_active, sort_order: String(p.sort_order),
    });
    setRows(pkgMilestones[p.id] || []);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    if (form.advertiser_subtypes.length === 0)
      return toast.error("Select at least one advertiser subcategory");
    if (form.duration_options.length === 0) return toast.error("Pick at least one duration");
    if (form.platform_support.length === 0) return toast.error("Pick at least one platform");
    if (rows.length === 0) return toast.error("Add at least one milestone");
    for (const r of rows) {
      if (r.pricing_type === "flat" && (r.price_usd == null || r.price_usd < 0)) {
        return toast.error("Flat milestones need a price ≥ 0");
      }
      if (r.pricing_type === "commission_pct" && (r.commission_pct == null || r.commission_pct < 0 || r.commission_pct > 100)) {
        return toast.error("Commission % must be between 0 and 100");
      }
    }
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      advertiser_subtypes: form.advertiser_subtypes,
      category_group_id: null,
      category_id: null,
      min_units: Number(form.min_units),
      max_units: Number(form.max_units),
      duration_options: form.duration_options,
      platform_support: form.platform_support,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    let pkgId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("ad_packages" as any).update(payload).eq("id", editing.id);
      if (error) { setSaving(false); return toast.error(error.message); }
    } else {
      const { data, error } = await supabase.from("ad_packages" as any).insert(payload).select("id").single();
      if (error) { setSaving(false); return toast.error(error.message); }
      pkgId = (data as any).id;
    }
    await supabase.from("package_milestones" as any).delete().eq("package_id", pkgId);
    if (rows.length > 0) {
      const insertRows = rows.map((r) => ({
        package_id: pkgId, milestone_id: r.milestone_id, step_order: r.step_order,
        pricing_type: r.pricing_type,
        price_usd: r.pricing_type === "flat" ? r.price_usd : null,
        commission_pct: r.pricing_type === "commission_pct" ? r.commission_pct : null,
      }));
      const { error: mErr } = await supabase.from("package_milestones" as any).insert(insertRows);
      if (mErr) { setSaving(false); return toast.error(mErr.message); }
    }
    setSaving(false);
    toast.success(editing ? "Package updated" : "Package created");
    if (!editing && pkgId) {
      supabase.functions.invoke("notify", { body: { event: "package_created", payload: { package_id: pkgId } } }).catch(() => {});
    }
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
    supabase.functions.invoke("notify", {
      body: { event: approve ? "package_order_approved" : "package_order_rejected", payload: { order_id: id, reason: notes } },
    }).catch(() => {});
    load();
  };

  const toggleSubtype = (id: AdvertiserSubtype) => {
    setForm({
      ...form,
      advertiser_subtypes: form.advertiser_subtypes.includes(id)
        ? form.advertiser_subtypes.filter((x) => x !== id)
        : [...form.advertiser_subtypes, id],
    });
  };
  const availableMs = useMemo(
    () => milestones.filter((m) => !rows.find((r) => r.milestone_id === m.id)),
    [milestones, rows],
  );
  const addRow = (mid: string) => {
    const m = milestones.find((x) => x.id === mid); if (!m) return;
    const pricing_type: "flat" | "commission_pct" = m.is_commission_based ? "commission_pct" : "flat";
    setRows([...rows, {
      milestone_id: mid, step_order: m.default_order,
      pricing_type,
      price_usd: pricing_type === "flat" ? 0 : null,
      commission_pct: pricing_type === "commission_pct" ? 5 : null,
    }].sort((a, b) => a.step_order - b.step_order));
  };

  const updateRow = (i: number, patch: Partial<PkgMilestone>) => {
    const next = [...rows]; next[i] = { ...next[i], ...patch }; setRows(next);
  };

  const togglePlatform = (v: string) => {
    setForm({
      ...form,
      platform_support: form.platform_support.includes(v)
        ? form.platform_support.filter((x) => x !== v)
        : [...form.platform_support, v],
    });
  };
  const toggleDuration = (d: number) => {
    setForm({
      ...form,
      duration_options: form.duration_options.includes(d)
        ? form.duration_options.filter((x) => x !== d)
        : [...form.duration_options, d].sort((a, b) => a - b),
    });
  };

  const rowLabel = (r: PkgMilestone) =>
    r.pricing_type === "commission_pct"
      ? `${r.commission_pct ?? 0}% / sale`
      : `$${(r.price_usd ?? 0).toFixed(2)}`;

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ad Packages</h1>
          <p className="text-sm text-muted-foreground">Templates with milestone-based pricing — advertisers pick which milestones to buy.</p>
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
              <PackageIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />No packages yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {packages.map((p) => {
                const subs = (p.advertiser_subtypes || []) as AdvertiserSubtype[];
                const ms = pkgMilestones[p.id] || [];
                return (
                  <div key={p.id} className="rounded-lg border bg-card p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{p.name}</p>
                        {subs.length === 0 ? (
                          <Badge variant="outline" className="text-destructive">No subcategory</Badge>
                        ) : (
                          subs.map((s) => <Badge key={s} variant="secondary">{subtypeLabel(s)}</Badge>)
                        )}
                        {(p.platform_support || []).map((pl) => <Badge key={pl} variant="outline" className="capitalize">{pl}</Badge>)}
                        {!p.is_active && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {p.min_units.toLocaleString()}–{p.max_units.toLocaleString()} daily users · durations {(p.duration_options || []).join(", ")}d
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ms.length === 0 ? "No milestones set" :
                          ms.map((r) => {
                            const m = milestones.find((x) => x.id === r.milestone_id);
                            return `${m?.name || "?"}: ${rowLabel(r)}`;
                          }).join(" · ")}
                      </p>
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
                        {o.platform && <Badge variant="outline" className="capitalize">{o.platform}</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {o.units.toLocaleString()} daily users · ${o.total_amount_usd} · {o.duration_days} days
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Advertiser: {o.advertiser_id}</p>
                      {Array.isArray(o.milestone_breakdown) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {o.milestone_breakdown.map((b: any) =>
                            b.pricing_type === "commission_pct"
                              ? `${b.name} ${b.commission_pct}%/sale`
                              : `${b.name} $${b.price_usd}`
                          ).join(" · ")}
                        </p>
                      )}
                      {o.app_links?.length > 0 && (
                        <ul className="mt-2 text-xs space-y-0.5">
                          {o.app_links.map((l, i) => (
                            <li key={i} className="truncate"><a className="text-primary underline" href={l} target="_blank" rel="noreferrer">{l}</a></li>
                          ))}
                        </ul>
                      )}
                      {o.admin_notes && <p className="mt-2 text-xs text-muted-foreground">Notes: {o.admin_notes}</p>}
                    </div>
                    {o.status === "pending_review" ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => reviewOrder(o.id, true)}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => reviewOrder(o.id, false)}>Reject</Button>
                      </div>
                    ) : (o.status === "active" || o.status === "completed") ? (
                      <Link to={`/ella/packages/orders/${o.id}/deliver`}>
                        <Button size="sm" variant="outline">Deliver / update</Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit package" : "New package"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Fintech growth pack" /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

            <div className="rounded-lg border p-3">
              <Label>Target subcategories *</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pick every advertiser subcategory that should see this package. Only these subcategories can view or buy it — no cross-category leaking.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(Object.keys(SUBTYPE_GROUPS) as (keyof typeof SUBTYPE_GROUPS)[]).map((g) => (
                  <div key={g} className="rounded-md border p-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {GROUP_LABELS[g]}
                    </p>
                    <div className="mt-1 space-y-1">
                      {SUBTYPE_GROUPS[g].map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={form.advertiser_subtypes.includes(s.id)}
                            onCheckedChange={() => toggleSubtype(s.id)}
                          />
                          {s.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {form.advertiser_subtypes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {form.advertiser_subtypes.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{subtypeLabel(s)}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min daily users</Label><Input type="number" value={form.min_units} onChange={(e) => setForm({ ...form, min_units: e.target.value })} /></div>
              <div><Label>Max daily users</Label><Input type="number" value={form.max_units} onChange={(e) => setForm({ ...form, max_units: e.target.value })} /></div>
            </div>

            <div>
              <Label>Durations available (days)</Label>
              <div className="mt-1 flex flex-wrap gap-3">
                {DURATION_PRESETS.map((d) => (
                  <label key={d} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.duration_options.includes(d)} onCheckedChange={() => toggleDuration(d)} />
                    {d}d
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Platforms supported</Label>
              <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { v: "mobile", label: "Mobile app" },
                  { v: "web", label: "Website" },
                  { v: "youtube", label: "YouTube" },
                  { v: "spotify", label: "Spotify" },
                  { v: "instagram", label: "Instagram" },
                  { v: "tiktok", label: "TikTok" },
                ].map((p) => (
                  <label key={p.v} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.platform_support.includes(p.v)} onCheckedChange={() => togglePlatform(p.v)} />
                    {p.label}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Website = 1 verified domain. Mobile = up to 2 app links (Install required). YouTube/Spotify/Instagram/TikTok = 1 creator link (no verification).
              </p>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Milestones & pricing</Label>
                {availableMs.length > 0 && (
                  <Select value="" onValueChange={addRow}>
                    <SelectTrigger className="w-52"><SelectValue placeholder="+ Add milestone" /></SelectTrigger>
                    <SelectContent>{availableMs.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Advertisers pick which milestones to buy. Flat = $/user; Commission = % per confirmed sale (charged from wallet later).
              </p>
              {rows.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No milestones added.</p>
              ) : (
                <div className="grid gap-2">
                  {rows.sort((a, b) => a.step_order - b.step_order).map((r, i) => {
                    const m = milestones.find((x) => x.id === r.milestone_id);
                    const commissionLocked = !!m?.is_commission_based;
                    return (
                      <div key={r.milestone_id} className="grid grid-cols-[1fr_70px_120px_110px_36px] gap-2 items-center">
                        <div className="text-sm truncate">{m?.name || r.milestone_id}</div>
                        <Input type="number" value={r.step_order}
                          onChange={(e) => updateRow(i, { step_order: Number(e.target.value) || 0 })} />
                        <Select value={r.pricing_type}
                          disabled={commissionLocked}
                          onValueChange={(v: "flat" | "commission_pct") => updateRow(i, {
                            pricing_type: v,
                            price_usd: v === "flat" ? (r.price_usd ?? 0) : null,
                            commission_pct: v === "commission_pct" ? (r.commission_pct ?? 5) : null,
                          })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {!commissionLocked && <SelectItem value="flat">Flat $/user</SelectItem>}
                            <SelectItem value="commission_pct">% per sale</SelectItem>
                          </SelectContent>
                        </Select>
                        {r.pricing_type === "flat" ? (
                          <Input type="number" step="0.01" placeholder="$/user" value={r.price_usd ?? 0}
                            onChange={(e) => updateRow(i, { price_usd: Number(e.target.value) || 0 })} />
                        ) : (
                          <Input type="number" step="0.1" placeholder="%" value={r.commission_pct ?? 0}
                            onChange={(e) => updateRow(i, { commission_pct: Number(e.target.value) || 0 })} />
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setRows(rows.filter((x) => x.milestone_id !== r.milestone_id))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}

                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
              <div className="flex items-center gap-2">
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
