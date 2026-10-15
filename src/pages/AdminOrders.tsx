import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ListSkeleton } from "@/components/skeletons";
import { toast } from "sonner";
import { Search, Package, Zap, Store, Inbox, ArrowUpRight, MapPin } from "lucide-react";
import { friendlyError } from "@/lib/errors";

type Source = "package" | "switch" | "offline";

type OrderRow = {
  id: string;
  source: Source;
  title: string;
  subtitle: string;
  advertiser_id: string;
  amount: number;
  status: string;
  created_at: string;
  raw: any;
};

const SOURCE_META: Record<Source, { label: string; icon: any }> = {
  package: { label: "Ad Package", icon: Package },
  switch: { label: "Switch Offer", icon: Zap },
  offline: { label: "Offline", icon: Store },
};

const PENDING_STATUSES: Record<Source, string[]> = {
  package: ["pending_review", "pending"],
  switch: ["pending"],
  offline: ["pending_acceptance", "fulfilled_by_advertiser"],
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  confirmed_by_admin: "bg-primary/10 text-primary border-primary/20",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  pending_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  pending_acceptance: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  fulfilled_by_advertiser: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AdminOrders() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [source, setSource] = useState<"all" | Source>("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<OrderRow | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [pkg, sw, off] = await Promise.all([
      supabase.from("package_orders" as any).select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("switch_offer_orders" as any).select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("offline_orders" as any).select("*").order("created_at", { ascending: false }).limit(300),
    ]);

    const list: OrderRow[] = [
      ...(((pkg.data as any[]) || []).map((o) => ({
        id: o.id,
        source: "package" as Source,
        title: o.package_name || "Ad package order",
        subtitle: `${o.units || 0} ${o.unit_label || "units"}${o.duration_days ? ` · ${o.duration_days} days` : ""}`,
        advertiser_id: o.advertiser_id,
        amount: Number(o.total_amount_usd || 0),
        status: o.status,
        created_at: o.created_at,
        raw: o,
      }))),
      ...(((sw.data as any[]) || []).map((o) => ({
        id: o.id,
        source: "switch" as Source,
        title: o.offer_title || "Switch offer order",
        subtitle: `${o.competitor_app_name || "Competitor"} → your app · ${o.batch_size || 0} users`,
        advertiser_id: o.advertiser_id,
        amount: Number(o.flat_price_usd || 0),
        status: o.status,
        created_at: o.created_at,
        raw: o,
      }))),
      ...(((off.data as any[]) || []).map((o) => ({
        id: o.id,
        source: "offline" as Source,
        title: o.buyer_name ? `Order from ${o.buyer_name}` : "Offline order",
        subtitle: `${o.quantity || 0} units · ${o.buyer_phone || ""}`,
        advertiser_id: o.advertiser_id,
        amount: Number(o.total_amount || 0),
        status: String(o.status),
        created_at: o.created_at,
        raw: o,
      }))),
    ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    setRows(list);

    const ids = [...new Set(list.map((r) => r.advertiser_id).filter(Boolean))];
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id,email,company_name").in("id", ids);
      const map: Record<string, string> = {};
      ((profs as any[]) || []).forEach((p) => { map[p.id] = p.company_name || p.email; });
      setNames(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const isPending = (r: OrderRow) => PENDING_STATUSES[r.source].includes(r.status);

  const counts = useMemo(() => ({
    pending: rows.filter(isPending).length,
    package: rows.filter((r) => r.source === "package").length,
    switch: rows.filter((r) => r.source === "switch").length,
    offline: rows.filter((r) => r.source === "offline").length,
  }), [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (tab === "pending" && !isPending(r)) return false;
    if (source !== "all" && r.source !== source) return false;
    if (!q.trim()) return true;
    const hay = `${r.title} ${r.subtitle} ${names[r.advertiser_id] || ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  }), [rows, tab, source, q, names]);

  const decide = async (r: OrderRow, approve: boolean) => {
    setBusy(true);
    let error: any = null;
    if (r.source === "package") {
      const res = await supabase.rpc("review_package_order" as any, {
        _order_id: r.id, _approve: approve, _notes: notes || "",
      });
      error = res.error;
      if (!error) {
        supabase.functions.invoke("notify", {
          body: {
            event: approve ? "package_order_approved" : "package_order_rejected",
            payload: { order_id: r.id, reason: notes },
          },
        }).catch(() => {});
      }
    } else if (r.source === "switch") {
      const res = await supabase.rpc("update_switch_order_delivery" as any, {
        _order_id: r.id,
        _users_delivered: Number(r.raw.users_delivered || 0),
        _status: approve ? "active" : "rejected",
        _notes: notes || null,
      });
      error = res.error;
    } else {
      const res = await supabase.rpc("confirm_offline_order" as any, {
        _order_id: r.id, _notes: notes || null,
      });
      error = res.error;
    }
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success(approve ? "Order accepted" : "Order rejected");
    setView(null);
    setNotes("");
    load();
  };

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-5">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
            <p className="text-sm text-muted-foreground">Ad package, switch offer and offline orders in one queue.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order or advertiser" className="pl-9" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {(["pending", "all"] as const).map((t) => (
            <button
              key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${
                tab === t ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              {t}
              {t === "pending" && counts.pending > 0 && (
                <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-destructive-foreground">{counts.pending}</span>
              )}
            </button>
          ))}
          <span className="mx-2 h-4 w-px bg-border" />
          {(["all", "package", "switch", "offline"] as const).map((s) => (
            <button
              key={s} onClick={() => setSource(s)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                source === s ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              {s === "all" ? "All sources" : SOURCE_META[s].label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {loading ? (
            <ListSkeleton rows={6} />
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No orders in this view.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 font-normal">Order</th>
                    <th className="px-3 py-2.5 font-normal">Advertiser</th>
                    <th className="px-3 py-2.5 font-normal">Source</th>
                    <th className="px-3 py-2.5 font-normal">Status</th>
                    <th className="px-3 py-2.5 font-normal text-right">Amount</th>
                    <th className="px-3 py-2.5 font-normal text-right">Created</th>
                    <th className="px-5 py-2.5 font-normal" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const Icon = SOURCE_META[r.source].icon;
                    return (
                      <tr key={`${r.source}-${r.id}`} className="border-b border-border last:border-0 transition-colors hover:bg-accent/40">
                        <td className="px-5 py-3">
                          <p className="font-medium text-foreground">{r.title}</p>
                          <p className="text-[11px] text-muted-foreground">{r.subtitle}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{names[r.advertiser_id] || "—"}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Icon className="h-3.5 w-3.5" />{SOURCE_META[r.source].label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className={`px-1.5 py-0 text-[10px] font-medium ${STATUS_STYLES[r.status] || "bg-muted text-muted-foreground border-border"}`}>
                            {r.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums text-muted-foreground">${r.amount.toFixed(2)}</td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="px-5 py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => { setView(r); setNotes(r.raw.admin_notes || ""); }}>
                            View <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!view} onOpenChange={(o) => { if (!o) { setView(null); setNotes(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{view?.title}</DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Source" value={SOURCE_META[view.source].label} />
                <Detail label="Status" value={view.status.replace(/_/g, " ")} />
                <Detail label="Advertiser" value={names[view.advertiser_id] || "—"} />
                <Detail label="Amount" value={`$${view.amount.toFixed(2)}`} />
                <Detail label="Details" value={view.subtitle} />
                <Detail label="Created" value={new Date(view.created_at).toLocaleString()} />
              </div>

              {(view.raw.target_countries?.length || view.raw.target_states?.length) && (
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> Target Location
                  </p>
                  <p className="text-xs font-semibold text-foreground">
                    {view.raw.target_countries?.join(", ") || "Global"}
                    {view.raw.target_states?.length ? ` (${view.raw.target_states.join(", ")})` : " (All states)"}
                  </p>
                </div>
              )}

              {view.source === "package" && Array.isArray(view.raw.app_links) && view.raw.app_links.length > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Links</p>
                  {view.raw.app_links.map((l: string) => (
                    <a key={l} href={l} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary hover:underline">{l}</a>
                  ))}
                </div>
              )}
              {view.source === "switch" && view.raw.target_link && (
                <div className="rounded-lg border border-border p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Target link</p>
                  <a href={view.raw.target_link} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary hover:underline">{view.raw.target_link}</a>
                </div>
              )}

              <div>
                <p className="mb-1 text-xs text-muted-foreground">Admin notes</p>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional note for the advertiser" />
              </div>

              <p className="text-xs text-muted-foreground">
                {view.source === "package" && "Approving activates the order and holds the escrow. Rejecting refunds the advertiser."}
                {view.source === "switch" && "Accepting sets the order live. Deliver metrics from the Switch Offers page."}
                {view.source === "offline" && "Confirming settles the offline order and pays the advertiser."}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            {view && view.source !== "offline" && (
              <Button variant="outline" disabled={busy || !isPendingSafe(view)} onClick={() => decide(view, false)}>
                Reject
              </Button>
            )}
            {view && (
              <Button disabled={busy || !isPendingSafe(view)} onClick={() => decide(view, true)}>
                {view.source === "offline" ? "Confirm order" : "Accept order"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );

  function isPendingSafe(r: OrderRow) {
    return PENDING_STATUSES[r.source].includes(r.status);
  }
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm capitalize text-foreground">{value}</p>
    </div>
  );
}
