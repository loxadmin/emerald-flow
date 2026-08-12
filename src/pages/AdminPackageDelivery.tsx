import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Save, Upload } from "lucide-react";
import AdminMigrationEntry from "@/components/AdminMigrationEntry";

type Order = {
  id: string; advertiser_id: string; package_name: string;
  units: number; total_amount_usd: number; duration_days: number;
  status: string; platform: string | null;
  starts_at: string | null; ends_at: string | null;
  selected_milestone_ids: string[] | null;
  app_links: string[];
  escrow_spent_usd: number | null;
  refunded_usd: number | null;
  refunded_at: string | null;
  milestone_breakdown: any;
};
type Milestone = { id: string; name: string; slug: string; requires_duration: boolean };
type Delivery = {
  id: string; milestone_id: string; delivery_date: string;
  users_delivered: number; txn_rows: any; total_txn_amount: number | null;
  charged_usd: number | null; fresh_users: number | null; engagement_metrics: any;
};

type Competitor = { id: string; name: string; is_active: boolean };

type CompetitorRow = { competitor_app_id: string; users_count: number };

type FormState = {
  users: string;
  date: string;
  txnCsv: string;
  notes: string;
  competitors: CompetitorRow[];
  fresh: string;
  opens: string;
  actives: string;
  posts: string;
};

const EMPTY_FORM = (): FormState => ({
  users: "", date: new Date().toISOString().slice(0, 10), txnCsv: "", notes: "",
  competitors: [], fresh: "", opens: "", actives: "", posts: "",
});

const SWITCH_SLUGS = new Set(["app_install", "signup", "kyc", "deposit"]);


function parseTxnCsv(csv: string): { user_ref: string; txn_id: string; amount_usd: number }[] {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: any[] = [];
  const startIdx = /user/i.test(lines[0] || "") && /txn/i.test(lines[0] || "") ? 1 : 0;
  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(",").map((s) => s.trim());
    if (parts.length < 3) continue;
    const amount = Number(parts[2]);
    if (!parts[0] || !parts[1] || Number.isNaN(amount)) continue;
    rows.push({ user_ref: parts[0], txn_id: parts[1], amount_usd: amount });
  }
  return rows;
}

export default function AdminPackageDelivery() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<string, FormState>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

  const load = async () => {
    if (!orderId) return;
    setLoading(true);
    const [{ data: o }, { data: ms }, { data: dv }, { data: cps }] = await Promise.all([
      supabase.from("package_orders" as any).select("*").eq("id", orderId).maybeSingle(),
      supabase.from("milestones" as any).select("id,name,slug,requires_duration"),
      supabase.from("package_order_deliveries" as any).select("*").eq("order_id", orderId).order("delivery_date"),
      supabase.from("competitor_apps" as any).select("id,name,is_active").eq("is_active", true).order("name"),
    ]);
    setOrder((o as any) || null);
    setCompetitors((cps as any) || []);
    setMilestones((ms as any) || []);
    setDeliveries((dv as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orderId]);

  const selectedMs = useMemo(() => {
    if (!order) return [] as Milestone[];
    return (order.selected_milestone_ids || [])
      .map((id) => milestones.find((m) => m.id === id))
      .filter(Boolean) as Milestone[];
  }, [order, milestones]);

  const setForm = (mid: string, patch: Partial<FormState>) =>
    setForms((f) => ({ ...f, [mid]: { ...EMPTY_FORM(), ...(f[mid] || {}), ...patch } }));

  const submit = async (m: Milestone) => {
    if (!order) return;
    const f: FormState = forms[m.id] || EMPTY_FORM();
    const users = Number(f.users) || 0;
    const isTxn = m.slug === "transaction" || m.slug === "sale";
    let txnRows: any = null;
    if (isTxn && f.txnCsv.trim()) {
      txnRows = parseTxnCsv(f.txnCsv);
      if (txnRows.length === 0) return toast.error("CSV must have rows like: user_ref,txn_id,amount_usd");
    }
    if (users <= 0 && (!txnRows || txnRows.length === 0)) {
      return toast.error("Enter users delivered or upload transactions.");
    }
    setSaving(m.id);
    const isSwitch = SWITCH_SLUGS.has(m.slug);
    const breakdown = isSwitch
      ? (f.competitors || []).filter((c) => c.competitor_app_id && Number(c.users_count) > 0)
          .map((c) => ({ competitor_app_id: c.competitor_app_id, users_count: Number(c.users_count) }))
      : null;
    const engagement: Record<string, number> = {};
    if (Number(f.opens) > 0) engagement.opens = Number(f.opens);
    if (Number(f.actives) > 0) engagement.active_users = Number(f.actives);
    if (Number(f.posts) > 0) engagement.posts = Number(f.posts);
    const { error } = await supabase.rpc("record_package_delivery" as any, {
      _order_id: order.id,
      _milestone_id: m.id,
      _delivery_date: f.date,
      _users_delivered: txnRows ? (users || txnRows.length) : users,
      _txn_rows: txnRows,
      _notes: f.notes || null,
      _competitor_breakdown: breakdown && breakdown.length > 0 ? breakdown : null,
      _engagement_metrics: Object.keys(engagement).length ? engagement : null,
      _fresh_users: Number(f.fresh) || 0,
    });
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success("Delivery recorded — escrow updated");
    setForms((s) => ({ ...s, [m.id]: EMPTY_FORM() }));
    load();
  };


  const onCsvFile = async (mid: string, file: File) => {
    const text = await file.text();
    setForm(mid, { txnCsv: text });
  };

  if (loading) return <AdminLayout><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div></AdminLayout>;
  if (!order) return <AdminLayout><p className="text-sm text-muted-foreground">Order not found.</p></AdminLayout>;

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin/packages"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Packages</Button></Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deliver: {order.package_name}</h1>
          <p className="text-sm text-muted-foreground">
            {order.units.toLocaleString()} target · {order.duration_days ? `${order.duration_days} days` : "one-off"} · advertiser {order.advertiser_id}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {selectedMs.map((m) => {
          const f: FormState = forms[m.id] || EMPTY_FORM();
          const isTxn = m.slug === "transaction" || m.slug === "sale";
          const isSwitch = SWITCH_SLUGS.has(m.slug);
          const dv = deliveries.filter((d) => d.milestone_id === m.id);
          const totalUsers = dv.reduce((s, d) => s + (d.users_delivered || 0), 0);
          const txnSum = dv.reduce((s, d) => s + (Number(d.total_txn_amount) || 0), 0);
          return (
            <div key={m.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold">{m.name}</h3>
                {m.requires_duration ? <Badge variant="secondary" className="text-[10px]">Per day</Badge> : <Badge variant="outline" className="text-[10px]">One-off total</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">
                  Delivered: {totalUsers.toLocaleString()} users{isTxn && txnSum > 0 ? ` · $${txnSum.toFixed(2)}` : ""}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {m.requires_duration && (
                  <div>
                    <Label>Delivery date</Label>
                    <Input type="date" value={f.date} onChange={(e) => setForm(m.id, { date: e.target.value })} />
                  </div>
                )}
                <div>
                  <Label>Users delivered</Label>
                  <Input type="number" min={0} value={f.users} onChange={(e) => setForm(m.id, { users: e.target.value })} />
                </div>
              </div>

              {isTxn && (
                <div className="mt-3">
                  <Label>Transactions CSV <span className="text-muted-foreground">(user_ref,txn_id,amount_usd)</span></Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input type="file" accept=".csv,text/csv" onChange={(e) => {
                      const f0 = e.target.files?.[0]; if (f0) onCsvFile(m.id, f0);
                    }} className="max-w-xs" />
                    <span className="text-xs text-muted-foreground"><Upload className="inline h-3 w-3" /> or paste below</span>
                  </div>
                  <Textarea rows={4} value={f.txnCsv} onChange={(e) => setForm(m.id, { txnCsv: e.target.value })}
                    placeholder={"user123,TXN-001,50\nuser456,TXN-002,120"} className="mt-2 font-mono text-xs" />
                </div>
              )}

              {isSwitch && competitors.length > 0 && (
                <div className="mt-3 rounded-md border border-dashed p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Users switched from (competitor breakdown)</Label>
                    <Button size="sm" variant="ghost" onClick={() =>
                      setForm(m.id, { competitors: [...(f.competitors || []), { competitor_app_id: "", users_count: 0 }] })
                    }>+ Add</Button>
                  </div>
                  {(f.competitors || []).map((row, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <select
                        className="flex-1 h-9 rounded-md border bg-background px-2 text-sm"
                        value={row.competitor_app_id}
                        onChange={(e) => {
                          const next = [...(f.competitors || [])];
                          next[idx] = { ...next[idx], competitor_app_id: e.target.value };
                          setForm(m.id, { competitors: next });
                        }}
                      >
                        <option value="">Select competitor…</option>
                        {competitors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <Input type="number" min={0} className="w-28" value={row.users_count}
                        onChange={(e) => {
                          const next = [...(f.competitors || [])];
                          next[idx] = { ...next[idx], users_count: Number(e.target.value) || 0 };
                          setForm(m.id, { competitors: next });
                        }} placeholder="Users" />
                      <Button size="sm" variant="ghost" onClick={() => {
                        const next = (f.competitors || []).filter((_, i) => i !== idx);
                        setForm(m.id, { competitors: next });
                      }}>×</Button>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground">e.g. 50 users switched from Opay, 30 from GTBank.</p>
                </div>
              )}

              <div className="mt-3">
                <Label>Notes (optional)</Label>
                <Input value={f.notes} onChange={(e) => setForm(m.id, { notes: e.target.value })} />
              </div>

              <Button className="mt-3" onClick={() => submit(m)} disabled={saving === m.id}>
                {saving === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Record delivery</>}
              </Button>

              {dv.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">History</p>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr><th className="text-left py-1">Date</th><th className="text-left py-1">Users</th>{isTxn && <th className="text-right py-1">Txn total</th>}</tr>
                      </thead>
                      <tbody>
                        {dv.map((d) => (
                          <tr key={d.id} className="border-t border-border/50">
                            <td className="py-1">{new Date(d.delivery_date).toLocaleDateString()}</td>
                            <td className="py-1">{d.users_delivered}</td>
                            {isTxn && <td className="py-1 text-right">${Number(d.total_txn_amount || 0).toFixed(2)}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <AdminMigrationEntry
          advertiserId={order.advertiser_id}
          packageOrderId={order.id}
        />
      </div>
    </AdminLayout>
  );
}
