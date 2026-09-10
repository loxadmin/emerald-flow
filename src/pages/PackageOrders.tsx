import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";
import { Loader2, Package as PackageIcon, ArrowLeft, TrendingUp, Calendar, CreditCard, Layers, ExternalLink } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import MigrationChart from "@/components/MigrationChart";
import DailyTargets from "@/components/DailyTargets";
import PackageMetricsPanel from "@/components/PackageMetricsPanel";
import { ChartSkeleton, StatsSkeleton } from "@/components/skeletons";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { swiftDailyRate, type SwiftOrderAction } from "@/lib/swift";

type Order = {
  id: string; package_name: string; unit_label: string;
  units: number; unit_price_usd: number; total_amount_usd: number; duration_days: number;
  app_links: string[]; payment_method: string; status: string;
  admin_notes: string | null; created_at: string; starts_at: string | null; ends_at: string | null;
  platform: string | null; selected_milestone_ids: string[] | null; milestone_breakdown: any;
  escrow_spent_usd: number | null; refunded_usd: number | null; refunded_at: string | null;
  package_type: string | null;
  swift_actions: SwiftOrderAction[] | null;
  proposed_actions: SwiftOrderAction[] | null;
  proposed_total_usd: number | null;
  admin_edit_note: string | null;
  swift_base_price_usd: number | null;
};
type Milestone = { id: string; name: string; slug: string; requires_duration: boolean };
type Delivery = {
  id: string; order_id: string; milestone_id: string;
  delivery_date: string; users_delivered: number;
  txn_rows: any; total_txn_amount: number | null; notes: string | null;
  charged_usd: number | null; fresh_users: number | null;
  engagement_metrics: any; competitor_breakdown: any;
  swift_action_key: string | null;
};


const STATUS: Record<string, string> = {
  pending_payment: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  pending_review: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  pending_advertiser_approval: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  completed: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-muted text-muted-foreground border-border",
};

export default function PackageOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
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
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const respond = async (orderId: string, accept: boolean) => {
    if (!accept && !window.confirm("Declining cancels this order and refunds the full amount to your wallet. Continue?")) return;
    setResponding(orderId);
    const { error } = await supabase.rpc("respond_swift_order_edit" as never, {
      _order_id: orderId, _accept: accept,
    } as never);
    setResponding(null);
    if (error) return toast.error(friendlyError(error));
    toast.success(accept ? "Changes approved. Your order is back with our team." : "Order cancelled and refunded.");
    load();
  };

  const deliveriesFor = (orderId: string, milestoneId: string) =>
    deliveries.filter((d) => d.order_id === orderId && d.milestone_id === milestoneId);

  return (
    <DashboardLayout>
      <MotionWrapper>
        {/* Modern Nav Breadcrumb Header */}
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <Link to="/packages">
              <Button variant="outline" size="sm" className="h-9 rounded-xl border-border hover:bg-accent">
                <ArrowLeft className="mr-2 h-4 w-4 text-primary" /> Packages
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Package Orders</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Track live delivery status, conversion charts, and user transactions.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4"><StatsSkeleton count={3} /><ChartSkeleton /></div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground bg-card/20 backdrop-blur-md">
            <PackageIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40 animate-bounce" />
            <p className="text-base font-semibold">No package orders submitted yet.</p>
            <p className="text-xs mt-1 text-muted-foreground">Launch a campaign to begin monitoring delivery metrics.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {orders.map((o) => (
              <div key={o.id} className="rounded-xl border border-border/40 bg-card/30 backdrop-blur-md p-5 space-y-5 shadow-md">
                {/* Header Row - Aligned precisely */}
                <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border/20 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 bg-primary/10 text-primary border border-primary/20 rounded-lg p-2.5">
                      <PackageIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-semibold text-foreground tracking-tight">{o.package_name}</h2>
                        <Badge variant="outline" className={`capitalize font-semibold text-[9px] px-2 py-0.5 rounded-full ${STATUS[o.status] || ""}`}>
                          {o.status.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap mt-1">
                        <span className="font-semibold text-foreground">{o.units.toLocaleString()} {o.unit_label || "users"}</span>
                        <span className="text-border/40">•</span>
                        <span>{o.payment_method}</span>
                        {o.duration_days && (
                          <>
                            <span className="text-border/40">•</span>
                            <span>{o.duration_days} days</span>
                          </>
                        )}
                        {o.platform && (
                          <>
                            <span className="text-border/40">•</span>
                            <span className="capitalize text-[10px] font-bold text-primary">{o.platform}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Investment</p>
                    <p className="text-base font-bold text-foreground font-mono mt-0.5">${Number(o.total_amount_usd).toFixed(2)}</p>
                  </div>
                </div>

                {/* Admin-proposed change awaiting your answer */}
                {o.status === "pending_advertiser_approval" && (() => {
                  const proposed = (o.proposed_actions || []) as SwiftOrderAction[];
                  const newTotal = Number(o.proposed_total_usd ?? o.total_amount_usd);
                  const diff = Number((newTotal - Number(o.total_amount_usd)).toFixed(2));
                  const dailyRate = swiftDailyRate(proposed);
                  return (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Our team proposed a change</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Review the daily deliverables below. Approving updates your order; declining cancels it and refunds you in full.
                        </p>
                      </div>
                      {o.admin_edit_note && (
                        <p className="rounded-lg border border-amber-500/20 bg-background/40 p-2.5 text-xs text-foreground/90">{o.admin_edit_note}</p>
                      )}
                      <div className="grid gap-1.5">
                        {proposed.map((a) => (
                          <div key={a.key} className="flex items-center justify-between rounded-lg border border-border/30 bg-background/40 px-3 py-2 text-xs">
                            <span className="font-semibold text-foreground">{a.name}</span>
                            <span className="font-mono text-foreground/90">${Number(a.price_per_user_per_day).toFixed(2)} / user / day</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-500/20 pt-3 text-xs">
                        <span className="text-muted-foreground">
                          Daily rate ${dailyRate.toFixed(2)} per user · new total{" "}
                          <span className="font-bold font-mono text-foreground">${newTotal.toFixed(2)}</span>
                        </span>
                        <span className={`font-semibold font-mono ${diff > 0 ? "text-amber-500" : diff < 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {diff > 0 ? `Top up $${diff.toFixed(2)}` : diff < 0 ? `Refund $${Math.abs(diff).toFixed(2)}` : "No price change"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-8 text-xs font-semibold" disabled={responding === o.id} onClick={() => respond(o.id, true)}>
                          {responding === o.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null} Approve changes
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" disabled={responding === o.id} onClick={() => respond(o.id, false)}>
                          Decline
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* Swift daily deliverables */}
                {o.package_type === "swift" && (o.swift_actions || []).length > 0 && o.status !== "pending_advertiser_approval" && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Daily deliverables</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {(o.swift_actions || []).map((a) => (
                        <div key={a.key} className="flex items-center justify-between rounded-lg border border-border/20 bg-secondary/15 px-3 py-1.5 text-xs">
                          <span className="font-medium text-foreground">{a.name}</span>
                          <span className="font-mono text-muted-foreground">${Number(a.price_per_user_per_day).toFixed(2)} / user / day</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date range details - Aligned, subtle box */}
                {o.starts_at && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/10 border border-border/20 rounded-lg px-3.5 py-2">
                    <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-semibold text-foreground/90">Delivery Timeline:</span>
                    <span className="font-mono">{new Date(o.starts_at).toLocaleDateString()}</span>
                    <span>→</span>
                    <span className="font-mono">{o.ends_at ? new Date(o.ends_at).toLocaleDateString() : "continuous"}</span>
                  </div>
                )}

                {/* Landing links list */}
                {o.app_links?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Campaign Target URLs</p>
                    <div className="grid gap-1.5">
                      {o.app_links.map((l, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg bg-secondary/15 border border-border/20 px-3 py-1.5 text-xs text-muted-foreground">
                          <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
                          <a href={l} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline font-mono font-medium">
                            {l}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivery graph + breakdown */}
                {(o.selected_milestone_ids || []).length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Conversion Funnel Delivery</p>

                    <div className="grid gap-4 md:grid-cols-2">
                      {(o.selected_milestone_ids || []).map((mid) => {
                        const m = milestones.find((x) => x.id === mid);
                        if (!m) return null;
                        const dv = deliveriesFor(o.id, mid);
                        const totalUsers = dv.reduce((s, d) => s + (d.users_delivered || 0), 0);
                        const txnTotal = dv.reduce((s, d) => s + (Number(d.total_txn_amount) || 0), 0);
                        const isTxn = m.slug === "transaction" || m.slug === "sale";
                        const chartData = dv.map((d) => ({
                          date: new Date(d.delivery_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                          users: d.users_delivered || 0,
                        }));
                        const pct = Math.min(100, Math.round((totalUsers / Math.max(o.units, 1)) * 100));
                        return (
                          <div key={mid} className="rounded-lg border border-border/40 bg-secondary/10 overflow-hidden flex flex-col justify-between">
                            {/* Inner header */}
                            <div className="flex items-center justify-between gap-2 px-3.5 py-3 border-b border-border/20">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-semibold text-foreground">{m.name}</span>
                                {m.requires_duration && <Badge variant="outline" className="text-[8px] px-1 bg-primary/5 text-primary border-primary/20">daily</Badge>}
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-semibold text-foreground font-mono">
                                  {totalUsers.toLocaleString()} <span className="text-[9px] text-muted-foreground font-normal">/ {o.units.toLocaleString()}</span>
                                </p>
                                {isTxn && txnTotal > 0 && (
                                  <p className="text-[9px] text-primary font-semibold font-mono">${txnTotal.toFixed(2)} Vol.</p>
                                )}
                              </div>
                            </div>

                            {/* Inner bar */}
                            <div className="px-3.5 pt-3">
                              <div className="flex items-center justify-between mb-1 text-[10px] font-medium text-muted-foreground">
                                <span>Progress</span>
                                <span className="text-foreground font-mono">{pct}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden border border-border/10">
                                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                              </div>
                            </div>

                            {/* Area chart */}
                            {chartData.length > 0 ? (
                              <div className="px-2 pb-4 pt-3 flex-1 min-h-[140px]">
                                <ResponsiveContainer width="100%" height={140}>
                                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id={`dl-${mid}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={25} />
                                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                                    <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={1.5} fill={`url(#dl-${mid})`} />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            ) : (
                              <p className="px-4 pb-5 pt-3 text-[10px] font-semibold text-muted-foreground flex-1 flex items-center justify-center">
                                No conversions recorded yet.
                              </p>
                            )}

                            {/* Transaction toggle panel */}
                            {isTxn && dv.some((d) => Array.isArray(d.txn_rows) && d.txn_rows.length > 0) && (
                              <details className="px-4 pb-4 pt-1 border-t border-border/30 group">
                                <summary className="text-[11px] font-bold cursor-pointer text-primary select-none list-none flex items-center gap-1.5">
                                  <span className="transition-transform group-open:rotate-90">▶</span> View conversion audit rows
                                </summary>
                                <div className="mt-3.5 max-h-48 overflow-y-auto rounded-xl border border-border/40 bg-background/40">
                                  <table className="w-full text-[10px] font-mono">
                                    <thead className="text-muted-foreground bg-accent/20 sticky top-0">
                                      <tr>
                                        <th className="text-left px-3 py-2">User ID</th>
                                        <th className="text-left px-3 py-2">Txn Ref</th>
                                        <th className="text-right px-3 py-2">Volume</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20">
                                      {dv.flatMap((d) => (Array.isArray(d.txn_rows) ? d.txn_rows : []).map((t: any, i: number) => (
                                        <tr key={d.id + i} className="hover:bg-accent/15 transition-colors">
                                          <td className="px-3 py-2 text-foreground/80 truncate max-w-[100px]">{t.user_ref}</td>
                                          <td className="px-3 py-2 font-mono text-muted-foreground truncate max-w-[120px]">{t.txn_id}</td>
                                          <td className="px-3 py-2 text-right font-bold text-foreground">${Number(t.amount_usd || 0).toFixed(2)}</td>
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


                  </div>
                )}

                {/* Day-by-day target tracker (duration-based orders) */}
                {o.status === "active" || o.status === "completed" ? (
                  <>
                    <PackageMetricsPanel order={o} milestones={milestones} deliveries={deliveries} />

                    {o.duration_days > 0 && o.starts_at && (

                      <DailyTargets
                        startsAt={o.starts_at}
                        durationDays={o.duration_days}
                        dailyTarget={o.units}
                        deliveredByDate={deliveries
                          .filter((d) => d.order_id === o.id)
                          .reduce<Record<string, number>>((acc, d) => {
                            const k = String(d.delivery_date).slice(0, 10);
                            acc[k] = Math.max(acc[k] || 0, d.users_delivered || 0);
                            return acc;
                          }, {})}
                      />
                    )}

                    {/* User migration source flow chart — always available */}
                    <MigrationChart packageOrderId={o.id} />
                  </>
                ) : null}

                {o.admin_notes && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4.5 text-xs text-amber-500 space-y-1">
                    <p className="font-bold uppercase tracking-wider text-[10px]">Operations Desk Note</p>
                    <p className="leading-relaxed">{o.admin_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </MotionWrapper>
    </DashboardLayout>
  );
}
