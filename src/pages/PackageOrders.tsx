import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";
import { Loader2, Package as PackageIcon, ArrowLeft } from "lucide-react";

type Order = {
  id: string; package_name: string; unit_label: string;
  units: number; unit_price_usd: number; total_amount_usd: number; duration_days: number;
  app_links: string[]; payment_method: string; status: string;
  admin_notes: string | null; created_at: string; starts_at: string | null; ends_at: string | null;
  platform: string | null; selected_milestone_ids: string[] | null; milestone_breakdown: any;
};
type Milestone = { id: string; name: string; slug: string; requires_duration: boolean };
type Delivery = {
  id: string; order_id: string; milestone_id: string;
  delivery_date: string; users_delivered: number;
  txn_rows: any; total_txn_amount: number | null; notes: string | null;
};

const STATUS: Record<string, string> = {
  pending_payment: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  pending_review: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  completed: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-muted text-muted-foreground border-border",
};

export default function PackageOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data }, { data: ms }] = await Promise.all([
        supabase.from("package_orders" as any)
          .select("*").eq("advertiser_id", user.id).order("created_at", { ascending: false }),
        supabase.from("milestones" as any).select("id,name,slug,requires_duration"),
      ]);
      const list = (data as any) || [];
      setOrders(list);
      setMilestones((ms as any) || []);
      if (list.length) {
        const ids = list.map((o: Order) => o.id);
        const { data: dv } = await supabase.from("package_order_deliveries" as any)
          .select("*").in("order_id", ids).order("delivery_date", { ascending: true });
        setDeliveries((dv as any) || []);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const deliveriesFor = (orderId: string, milestoneId: string) =>
    deliveries.filter((d) => d.order_id === orderId && d.milestone_id === milestoneId);

  return (
    <DashboardLayout>
      <MotionWrapper>
        <div className="mb-6 flex items-center gap-3">
          <Link to="/packages"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Packages</Button></Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My package orders</h1>
            <p className="text-sm text-muted-foreground">Track delivery for every package you've purchased.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
            <PackageIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
            No orders yet. Browse packages to get started.
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{o.package_name}</p>
                      <Badge variant="outline" className={STATUS[o.status] || ""}>{o.status.replace(/_/g, " ")}</Badge>
                      <Badge variant="secondary">{o.payment_method}</Badge>
                      {o.platform && <Badge variant="outline" className="capitalize">{o.platform}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {o.units.toLocaleString()} {o.unit_label || "users"} · ${o.total_amount_usd}
                      {o.duration_days ? ` · ${o.duration_days} days` : ""}
                    </p>
                    {o.starts_at && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Running: {new Date(o.starts_at).toLocaleDateString()} → {o.ends_at ? new Date(o.ends_at).toLocaleDateString() : "—"}
                      </p>
                    )}
                    {o.app_links?.length > 0 && (
                      <ul className="mt-2 text-xs space-y-0.5">
                        {o.app_links.map((l, i) => (
                          <li key={i} className="truncate"><a className="text-primary underline" href={l} target="_blank" rel="noreferrer">{l}</a></li>
                        ))}
                      </ul>
                    )}

                    {/* Delivery breakdown */}
                    {(o.selected_milestone_ids || []).length > 0 && (
                      <div className="mt-3 space-y-2">
                        {(o.selected_milestone_ids || []).map((mid) => {
                          const m = milestones.find((x) => x.id === mid);
                          if (!m) return null;
                          const dv = deliveriesFor(o.id, mid);
                          const totalUsers = dv.reduce((s, d) => s + (d.users_delivered || 0), 0);
                          const txnTotal = dv.reduce((s, d) => s + (Number(d.total_txn_amount) || 0), 0);
                          const isTxn = m.slug === "transaction" || m.slug === "sale";
                          return (
                            <div key={mid} className="rounded-md border bg-muted/30 p-2.5">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{m.name}</span>
                                  {m.requires_duration && <Badge variant="outline" className="text-[9px]">daily</Badge>}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {totalUsers.toLocaleString()} / {o.units.toLocaleString()}{m.requires_duration ? " users/day target" : " users delivered"}
                                  {isTxn && txnTotal > 0 && <> · ${txnTotal.toFixed(2)} txn volume</>}
                                </div>
                              </div>
                              {m.requires_duration && dv.length > 0 && (
                                <div className="mt-2 max-h-32 overflow-y-auto">
                                  <table className="w-full text-[11px]">
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
                              )}
                              {isTxn && dv.some((d) => Array.isArray(d.txn_rows) && d.txn_rows.length > 0) && (
                                <details className="mt-2">
                                  <summary className="text-xs cursor-pointer text-primary">Transaction details</summary>
                                  <div className="mt-1 max-h-40 overflow-y-auto">
                                    <table className="w-full text-[11px]">
                                      <thead className="text-muted-foreground">
                                        <tr><th className="text-left py-1">User</th><th className="text-left py-1">Txn ID</th><th className="text-right py-1">Amount</th></tr>
                                      </thead>
                                      <tbody>
                                        {dv.flatMap((d) => (Array.isArray(d.txn_rows) ? d.txn_rows : []).map((t: any, i: number) => (
                                          <tr key={d.id + i} className="border-t border-border/50">
                                            <td className="py-1">{t.user_ref}</td>
                                            <td className="py-1 font-mono">{t.txn_id}</td>
                                            <td className="py-1 text-right">${Number(t.amount_usd || 0).toFixed(2)}</td>
                                          </tr>
                                        )))}
                                      </tbody>
                                    </table>
                                  </div>
                                </details>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {o.admin_notes && <p className="mt-2 text-xs text-muted-foreground">Admin notes: {o.admin_notes}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </MotionWrapper>
    </DashboardLayout>
  );
}
