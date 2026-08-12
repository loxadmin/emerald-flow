import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, Building2, Zap, ClipboardList, ExternalLink } from "lucide-react";
import CompetitorLogoUpload from "@/components/CompetitorLogoUpload";
import AdminMigrationEntry from "@/components/AdminMigrationEntry";

const SUBTYPES = [
  "musician","youtuber","social_media_creator",
  "app","website","fintech",
  "ecommerce","online_vendor","realtor",
  "food_beverage","household_items","telecom","oil_gas",
];
const PLATFORMS = ["mobile","web","youtube","spotify","instagram","tiktok"];

type Competitor = { id: string; name: string; logo_url: string | null; logo_path: string | null; website_url: string | null; category: string | null; is_active: boolean };
type Offer = {
  id: string; title: string; description: string | null;
  competitor_app_id: string | null; advertiser_subtypes: string[];
  platform: string; batch_size: number; flat_price_usd: number;
  target_link_required: boolean; is_active: boolean;
};
type Order = {
  id: string; advertiser_id: string; offer_title: string;
  competitor_app_name: string | null; batch_size: number;
  flat_price_usd: number; target_link: string | null;
  status: string; users_delivered: number; admin_notes: string | null;
  created_at: string; completed_at: string | null;
};

export default function AdminSwitchOffers() {
  const [tab, setTab] = useState("offers");
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [compOpen, setCompOpen] = useState(false);
  const [compEdit, setCompEdit] = useState<Competitor | null>(null);
  const [compForm, setCompForm] = useState({ name: "", logo_url: "", logo_path: "", website_url: "", category: "", is_active: true });

  const [offOpen, setOffOpen] = useState(false);
  const [offEdit, setOffEdit] = useState<Offer | null>(null);
  const [offForm, setOffForm] = useState<any>({
    title: "", description: "", competitor_app_id: "",
    advertiser_subtypes: [] as string[], platform: "mobile",
    batch_size: 1000, flat_price_usd: 500,
    target_link_required: true, is_active: true,
  });

  const [ordEdit, setOrdEdit] = useState<Order | null>(null);
  const [ordForm, setOrdForm] = useState({ users_delivered: 0, status: "active", notes: "" });
  const [metricForm, setMetricForm] = useState({
    users_switched: 0, signups: 0, kyc_completed: 0, profiles_created: 0, deposits_count: 0,
  });
  const [txnRows, setTxnRows] = useState<TxnRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { rows, errors } = parseTxnCsv(text);
    setTxnRows(rows);
    setCsvError(errors.length ? errors.slice(0, 3).join(" · ") : null);
    if (rows.length && !metricForm.deposits_count) {
      setMetricForm((f) => ({ ...f, deposits_count: rows.length }));
    }
  };

  const load = async () => {
    setLoading(true);
    const [c, o, or] = await Promise.all([
      supabase.from("competitor_apps" as any).select("*").order("name"),
      supabase.from("switch_offers" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("switch_offer_orders" as any).select("*").order("created_at", { ascending: false }),
    ]);
    setCompetitors((c.data as any) || []);
    setOffers((o.data as any) || []);
    setOrders((or.data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Competitor CRUD
  const openComp = (c: Competitor | null) => {
    setCompEdit(c);
    setCompForm(c ? {
      name: c.name, logo_url: c.logo_url || "", logo_path: c.logo_path || "",
      website_url: c.website_url || "", category: c.category || "", is_active: c.is_active,
    } : { name: "", logo_url: "", logo_path: "", website_url: "", category: "", is_active: true });
    setCompOpen(true);
  };
  const saveComp = async () => {
    if (!compForm.name.trim()) return toast.error("Name required");
    const payload = {
      name: compForm.name.trim(),
      logo_url: compForm.logo_url.trim() || null,
      logo_path: compForm.logo_path.trim() || null,
      website_url: compForm.website_url.trim() || null,
      category: compForm.category.trim() || null,
      is_active: compForm.is_active,
    };
    const { error } = compEdit
      ? await supabase.from("competitor_apps" as any).update(payload).eq("id", compEdit.id)
      : await supabase.from("competitor_apps" as any).insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setCompOpen(false); load();
  };
  const delComp = async (id: string) => {
    if (!confirm("Delete this competitor app?")) return;
    const { error } = await supabase.from("competitor_apps" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  // Offer CRUD
  const openOff = (o: Offer | null) => {
    setOffEdit(o);
    setOffForm(o ? {
      title: o.title, description: o.description || "",
      competitor_app_id: o.competitor_app_id || "",
      advertiser_subtypes: o.advertiser_subtypes || [],
      platform: o.platform, batch_size: o.batch_size,
      flat_price_usd: o.flat_price_usd,
      target_link_required: o.target_link_required,
      is_active: o.is_active,
    } : {
      title: "", description: "", competitor_app_id: "",
      advertiser_subtypes: [], platform: "mobile",
      batch_size: 1000, flat_price_usd: 500,
      target_link_required: true, is_active: true,
    });
    setOffOpen(true);
  };
  const saveOff = async () => {
    if (!offForm.title.trim()) return toast.error("Title required");
    if (offForm.advertiser_subtypes.length === 0) return toast.error("Pick at least one advertiser subtype");
    const payload = {
      title: offForm.title.trim(),
      description: offForm.description.trim() || null,
      competitor_app_id: offForm.competitor_app_id || null,
      advertiser_subtypes: offForm.advertiser_subtypes,
      platform: offForm.platform,
      batch_size: Number(offForm.batch_size),
      flat_price_usd: Number(offForm.flat_price_usd),
      target_link_required: offForm.target_link_required,
      is_active: offForm.is_active,
    };
    const { error } = offEdit
      ? await supabase.from("switch_offers" as any).update(payload).eq("id", offEdit.id)
      : await supabase.from("switch_offers" as any).insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOffOpen(false); load();
  };
  const delOff = async (id: string) => {
    if (!confirm("Delete this offer?")) return;
    const { error } = await supabase.from("switch_offers" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  // Fulfillment
  const openOrd = (o: Order) => {
    setOrdEdit(o);
    setOrdForm({ users_delivered: o.users_delivered, status: o.status, notes: o.admin_notes || "" });
  };
  const saveOrd = async () => {
    if (!ordEdit) return;
    const { error } = await supabase.rpc("update_switch_order_delivery" as any, {
      _order_id: ordEdit.id,
      _users_delivered: Number(ordForm.users_delivered),
      _status: ordForm.status,
      _notes: ordForm.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Updated");
    setOrdEdit(null); load();
  };

  const toggleSubtype = (s: string) => {
    setOffForm((f: any) => ({
      ...f,
      advertiser_subtypes: f.advertiser_subtypes.includes(s)
        ? f.advertiser_subtypes.filter((x: string) => x !== s)
        : [...f.advertiser_subtypes, s],
    }));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Switch Offers</h1>
        <p className="text-sm text-muted-foreground">Flat-price offers advertisers can buy to acquire users switching from competitor apps.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="offers"><Zap className="mr-2 h-4 w-4" />Offers</TabsTrigger>
          <TabsTrigger value="competitors"><Building2 className="mr-2 h-4 w-4" />Competitor apps</TabsTrigger>
          <TabsTrigger value="orders"><ClipboardList className="mr-2 h-4 w-4" />Orders ({orders.length})</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <TabsContent value="offers" className="mt-4">
              <div className="mb-3 flex justify-end">
                <Button onClick={() => openOff(null)}><Plus className="mr-2 h-4 w-4" />New offer</Button>
              </div>
              {offers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
                  No switch offers yet.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {offers.map((o) => {
                    const c = competitors.find((x) => x.id === o.competitor_app_id);
                    return (
                      <div key={o.id} className="rounded-lg border bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">{o.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {o.batch_size.toLocaleString()} users from {c?.name || "any competitor"} · ${Number(o.flat_price_usd).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="icon" variant="ghost" onClick={() => openOff(o)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => delOff(o.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge variant="outline" className="capitalize text-[10px]">{o.platform}</Badge>
                          {!o.is_active && <Badge variant="secondary" className="text-[10px]">inactive</Badge>}
                          {(o.advertiser_subtypes || []).map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="competitors" className="mt-4">
              <div className="mb-3 flex justify-end">
                <Button onClick={() => openComp(null)}><Plus className="mr-2 h-4 w-4" />Add competitor</Button>
              </div>
              {competitors.length === 0 ? (
                <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
                  No competitor apps yet. Add some so admin can track user switches.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {competitors.map((c) => (
                    <div key={c.id} className="rounded-lg border bg-card p-3 flex items-center gap-3">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt="" className="h-9 w-9 rounded object-cover bg-background border" />
                      ) : (
                        <div className="h-9 w-9 rounded bg-muted flex items-center justify-center text-xs">{c.name[0]}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {c.category || "—"}{!c.is_active && " · inactive"}
                          {c.website_url && (
                            <> · <a href={c.website_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5 hover:underline">
                              site <ExternalLink className="h-2.5 w-2.5" />
                            </a></>
                          )}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => openComp(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => delComp(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="orders" className="mt-4">
              {orders.length === 0 ? (
                <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
                  No orders yet.
                </div>
              ) : (
                <div className="grid gap-2">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-lg border bg-card p-3 flex items-center gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{o.offer_title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          from {o.competitor_app_name || "—"} · {o.batch_size.toLocaleString()} users · ${Number(o.flat_price_usd).toFixed(2)}
                          {o.target_link ? ` · ${o.target_link}` : ""}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Delivered: {o.users_delivered.toLocaleString()} / {o.batch_size.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px]">{o.status.replace(/_/g, " ")}</Badge>
                      <Button size="sm" variant="outline" onClick={() => openOrd(o)}>Update</Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Competitor dialog */}
      <Dialog open={compOpen} onOpenChange={setCompOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{compEdit ? "Edit" : "Add"} competitor app</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={compForm.name} onChange={(e) => setCompForm({ ...compForm, name: e.target.value })} placeholder="Opay" /></div>
            <CompetitorLogoUpload
              value={{ url: compForm.logo_url || null, path: compForm.logo_path || null }}
              onChange={(v) => setCompForm({ ...compForm, logo_url: v.url || "", logo_path: v.path || "" })}
            />
            <div><Label>Website / platform link (optional)</Label><Input value={compForm.website_url} onChange={(e) => setCompForm({ ...compForm, website_url: e.target.value })} placeholder="https://opay.com" /></div>
            <div><Label>Category (optional)</Label><Input value={compForm.category} onChange={(e) => setCompForm({ ...compForm, category: e.target.value })} placeholder="fintech, social, ecommerce…" /></div>
            <div className="flex items-center gap-2"><Switch checked={compForm.is_active} onCheckedChange={(v) => setCompForm({ ...compForm, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCompOpen(false)}>Cancel</Button><Button onClick={saveComp}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offer dialog */}
      <Dialog open={offOpen} onOpenChange={setOffOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{offEdit ? "Edit" : "New"} switch offer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={offForm.title} onChange={(e) => setOffForm({ ...offForm, title: e.target.value })} placeholder="1,000 Opay users ready to switch" /></div>
            <div><Label>Description</Label><Textarea rows={2} value={offForm.description} onChange={(e) => setOffForm({ ...offForm, description: e.target.value })} /></div>
            <div>
              <Label>Competitor app users switch from</Label>
              <Select value={offForm.competitor_app_id || "none"} onValueChange={(v) => setOffForm({ ...offForm, competitor_app_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any / not specified</SelectItem>
                  {competitors.filter((c) => c.is_active).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Available to advertiser subtypes</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {SUBTYPES.map((s) => {
                  const active = offForm.advertiser_subtypes.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggleSubtype(s)}
                      className={`text-[11px] rounded-full border px-2.5 py-1 ${active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Platform</Label>
                <Select value={offForm.platform} onValueChange={(v) => setOffForm({ ...offForm, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Batch size (users)</Label><Input type="number" min={1} value={offForm.batch_size} onChange={(e) => setOffForm({ ...offForm, batch_size: e.target.value })} /></div>
            </div>
            <div><Label>Flat price (USD)</Label><Input type="number" min={0} step="0.01" value={offForm.flat_price_usd} onChange={(e) => setOffForm({ ...offForm, flat_price_usd: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={offForm.target_link_required} onCheckedChange={(v) => setOffForm({ ...offForm, target_link_required: v })} /><Label>Require advertiser target link</Label></div>
            <div className="flex items-center gap-2"><Switch checked={offForm.is_active} onCheckedChange={(v) => setOffForm({ ...offForm, is_active: v })} /><Label>Active (visible to advertisers)</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOffOpen(false)}>Cancel</Button><Button onClick={saveOff}>Save offer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order fulfillment */}
      <Dialog open={!!ordEdit} onOpenChange={(v) => !v && setOrdEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Deliver switch cohort</DialogTitle></DialogHeader>
          {ordEdit && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-secondary/30 p-3">
                <p className="text-sm font-medium">{ordEdit.offer_title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {ordEdit.batch_size.toLocaleString()} users from {ordEdit.competitor_app_name || "competitor"} · ${Number(ordEdit.flat_price_usd).toFixed(2)}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div><Label className="text-xs">Users switched</Label><Input type="number" min={0} value={metricForm.users_switched} onChange={(e) => setMetricForm({ ...metricForm, users_switched: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Signed up</Label><Input type="number" min={0} value={metricForm.signups} onChange={(e) => setMetricForm({ ...metricForm, signups: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">KYC completed</Label><Input type="number" min={0} value={metricForm.kyc_completed} onChange={(e) => setMetricForm({ ...metricForm, kyc_completed: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Profiles created</Label><Input type="number" min={0} value={metricForm.profiles_created} onChange={(e) => setMetricForm({ ...metricForm, profiles_created: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Deposited / transacted</Label><Input type="number" min={0} value={metricForm.deposits_count} onChange={(e) => setMetricForm({ ...metricForm, deposits_count: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Status</Label>
                  <Select value={ordForm.status} onValueChange={(v) => setOrdForm({ ...ordForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="delivering">Delivering</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <Label className="text-xs">Transaction proof CSV (required when deposits &gt; 0)</Label>
                <p className="text-[11px] text-muted-foreground">
                  Columns: transaction_id, amount. Headers optional.
                </p>
                <Input type="file" accept=".csv,text/csv" onChange={onCsv} />
                {csvError && <p className="text-[11px] text-destructive">{csvError}</p>}
                {txnRows.length > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{txnRows.length.toLocaleString()}</span> transactions ·
                    total <span className="font-semibold text-foreground">${sumTxn(txnRows).toFixed(2)}</span>
                    <div className="mt-2 max-h-32 overflow-auto rounded border">
                      <table className="w-full text-left text-[10px]">
                        <tbody>
                          {txnRows.slice(0, 25).map((t, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-2 py-1 font-mono">{t.txn_id}</td>
                              <td className="px-2 py-1 text-right tabular-nums">${t.amount_usd.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={ordForm.notes} onChange={(e) => setOrdForm({ ...ordForm, notes: e.target.value })} /></div>
              <AdminMigrationEntry
                advertiserId={ordEdit.advertiser_id}
                switchOrderId={ordEdit.id}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrdEdit(null)}>Cancel</Button>
            <Button onClick={saveOrd} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Save delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
