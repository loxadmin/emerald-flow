import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MotionWrapper from "@/components/MotionWrapper";
import { Loader2, Package as PackageIcon, ArrowLeft, TrendingUp, Calendar, ExternalLink, BarChart3, ShieldCheck, MapPin } from "lucide-react";
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
  target_countries: string[] | null;
  target_states: string[] | null;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedOrderId = searchParams.get("orderId");

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

  const activeOrder = orders.find((o) => o.id === selectedOrderId) || null;

  // Render Concise Order Card for All Orders List (Overview)
  const renderOverviewOrderCard = (o: Order) => {
    const orderDeliveries = deliveries.filter((d) => d.order_id === o.id);
    const totalDelivered = (o.package_type === "swift" || (o.swift_actions || []).length > 0)
      ? orderDeliveries.filter((d) => d.swift_action_key === "acquisition" || (!d.swift_action_key && !d.milestone_id)).reduce((sum, d) => sum + (d.users_delivered || 0), 0)
      : orderDeliveries.reduce((sum, d) => sum + (d.users_delivered || 0), 0);
    const pct = Math.min(100, Math.round((totalDelivered / Math.max(o.units, 1)) * 100));
    const spent = Number(o.escrow_spent_usd || 0);
    const total = Number(o.total_amount_usd || 0);
    const remaining = Math.max(total - spent, 0);

    return (
      <div
        key={o.id}
        onClick={() => setSearchParams({ orderId: o.id })}
        className="group relative cursor-pointer rounded-xl border border-border/50 bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-md space-y-4"
      >
        {/* Header Row */}
        <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border/20 pb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 bg-primary/10 text-primary border border-primary/20 rounded-xl p-2.5">
              <PackageIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors truncate">
                  {o.package_name}
                </h3>
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
                {(o.target_countries?.length || o.target_states?.length) && (
                  <>
                    <span className="text-border/40">•</span>
                    <span className="flex items-center gap-1 text-primary">
                      <MapPin className="h-3 w-3" />
                      {o.target_countries?.join(", ")}
                      {o.target_states?.length ? ` (${o.target_states.join(", ")})` : ""}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-right flex items-center gap-3">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Investment</p>
              <p className="text-base font-bold text-foreground font-mono mt-0.5">${Number(o.total_amount_usd).toFixed(2)}</p>
            </div>
            <Button
              size="sm"
              className="h-8 rounded-lg text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                setSearchParams({ orderId: o.id });
              }}
            >
              <BarChart3 className="h-3.5 w-3.5" /> View stats
            </Button>
          </div>
        </div>

        {/* Progress & Delivery Metrics Summary Row */}
        <div className="grid gap-3 sm:grid-cols-3 bg-secondary/10 border border-border/30 rounded-lg p-3">
          <div>
            <div className="flex justify-between text-[10px] font-semibold text-muted-foreground mb-1">
              <span>Delivery Progress</span>
              <span className="text-primary font-mono">{pct}% ({totalDelivered.toLocaleString()} delivered)</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden border border-border/10">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t sm:border-t-0 sm:border-l border-border/20 sm:pl-3 pt-2 sm:pt-0">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="leading-tight">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Delivery Timeline</p>
              <p className="font-mono text-[11px] font-semibold text-foreground">
                {o.starts_at ? `${new Date(o.starts_at).toLocaleDateString()} → ${o.ends_at ? new Date(o.ends_at).toLocaleDateString() : "continuous"}` : "Pending schedule"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t sm:border-t-0 sm:border-l border-border/20 sm:pl-3 pt-2 sm:pt-0">
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="leading-tight">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Escrow Spent / Balance</p>
              <p className="font-mono text-[11px] font-semibold text-foreground">
                Spent: ${spent.toFixed(2)} · <span className="text-primary font-bold">Escrow: ${remaining.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Admin-proposed change banner if pending approval */}
        {o.status === "pending_advertiser_approval" && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-amber-500">Proposed order changes awaiting your review</span>
            <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
              Review changes
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Render Full Standalone Order Details View
  const renderSingleOrderDetails = (o: Order) => {
    const orderDeliveries = deliveries.filter((d) => d.order_id === o.id);
    const totalDelivered = (o.package_type === "swift" || (o.swift_actions || []).length > 0)
      ? orderDeliveries.filter((d) => d.swift_action_key === "acquisition" || (!d.swift_action_key && !d.milestone_id)).reduce((sum, d) => sum + (d.users_delivered || 0), 0)
      : orderDeliveries.reduce((sum, d) => sum + (d.users_delivered || 0), 0);

    return (
      <div key={o.id} className="space-y-6">
        {/* Header Summary Card */}
        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 bg-primary/10 text-primary border border-primary/20 rounded-xl p-2.5">
                <PackageIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-extrabold text-foreground tracking-tight">{o.package_name}</h2>
                  <Badge variant="outline" className={`capitalize font-semibold text-[9px] px-2.5 py-0.5 rounded-full ${STATUS[o.status] || ""}`}>
                    {o.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-1">
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
                      <span className="capitalize font-bold text-primary">{o.platform}</span>
                    </>
                  )}
                  {totalDelivered > 0 && (
                    <>
                      <span className="text-border/40">•</span>
                      <span className="text-primary font-bold font-mono">{totalDelivered.toLocaleString()} delivered</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Investment</p>
              <p className="text-xl font-extrabold text-foreground font-mono mt-0.5">${Number(o.total_amount_usd).toFixed(2)}</p>
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
                {[{ key: "acquisition", name: "Users acquired", price_per_user_per_day: Number(o.swift_base_price_usd || 0) } as SwiftOrderAction,
                  ...(o.swift_actions || [])].map((a) => {
                  const done = deliveries
                    .filter((d) => d.order_id === o.id && d.swift_action_key === a.key)
                    .reduce((s, d) => s + (d.users_delivered || 0), 0);
                  return (
                    <div key={a.key} className="flex items-center justify-between rounded-lg border border-border/20 bg-secondary/15 px-3 py-1.5 text-xs">
                      <span className="font-medium text-foreground">
                        {a.name}
                        {done > 0 && <span className="ml-2 text-[10px] text-primary">{done.toLocaleString()} delivered</span>}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        ${Number(a.price_per_user_per_day).toFixed(2)}{a.key === "acquisition" ? " / user" : " / user / day"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Target URLs */}
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

          {o.admin_notes && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-500 space-y-1">
              <p className="font-bold uppercase tracking-wider text-[10px]">Operations Desk Note</p>
              <p className="leading-relaxed">{o.admin_notes}</p>
            </div>
          )}
        </div>

        {/* Orderly Bento KPI Cards & Analytics Charts */}
        <PackageMetricsPanel order={o} milestones={milestones} deliveries={deliveries} />

        {/* Delivery graph + breakdown for milestones */}
        {(o.selected_milestone_ids || []).length > 0 && (
          <div className="space-y-4 rounded-xl border border-border/50 bg-card p-5 shadow-sm">
            <div className="border-b border-border/20 pb-3">
              <h3 className="text-sm font-bold text-foreground tracking-tight">Conversion Funnel Delivery</h3>
              <p className="text-[11px] text-muted-foreground">Milestone conversion rates and transactional audit logs</p>
            </div>

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

                    <div className="px-3.5 pt-3">
                      <div className="flex items-center justify-between mb-1 text-[10px] font-medium text-muted-foreground">
                        <span>Progress</span>
                        <span className="text-foreground font-mono">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden border border-border/10">
                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

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

        {/* Day-by-day target tracker */}
        {o.duration_days > 0 && o.starts_at && (
          <DailyTargets
            startsAt={o.starts_at}
            durationDays={o.duration_days}
            dailyTarget={o.units}
            deliveredByDate={orderDeliveries
              .reduce<Record<string, number>>((acc, d) => {
                const k = String(d.delivery_date).slice(0, 10);
                acc[k] = Math.max(acc[k] || 0, d.users_delivered || 0);
                return acc;
              }, {})}
          />
        )}

        <MigrationChart packageOrderId={o.id} />
      </div>
    );
  };

  return (
    <DashboardLayout>
      <MotionWrapper>
        {/* Standardized Breadcrumb Navigation Above Header */}
        <div className="mb-3">
          {activeOrder ? (
            <button
              onClick={() => setSearchParams({})}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-primary" /> Back to All Orders
            </button>
          ) : (
            <Link
              to="/packages"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-primary" /> Back to Ad Packages
            </Link>
          )}
        </div>

        {/* Header Title & Selector */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap border-b border-border/40 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {activeOrder ? activeOrder.package_name : "Package Orders"}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {activeOrder
                ? "Standalone order delivery metrics, conversion charts, and escrow status."
                : "Track live delivery status, conversion charts, and user transactions across all orders."}
            </p>
          </div>

          {/* Order selector dropdown */}
          {orders.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Select Order:</span>
              <Select
                value={activeOrder ? activeOrder.id : "all"}
                onValueChange={(val) => {
                  if (val === "all") setSearchParams({});
                  else setSearchParams({ orderId: val });
                }}
              >
                <SelectTrigger className="w-[220px] sm:w-[280px] h-9 text-xs font-semibold rounded-xl border-border/60 bg-card">
                  <SelectValue placeholder="All Orders" />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover">
                  <SelectItem value="all" className="text-xs font-semibold">
                    All Orders ({orders.length})
                  </SelectItem>
                  {orders.map((ord) => (
                    <SelectItem key={ord.id} value={ord.id} className="text-xs font-medium">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="truncate">{ord.package_name}</span>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">(${Number(ord.total_amount_usd).toFixed(0)})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-4"><StatsSkeleton count={3} /><ChartSkeleton /></div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground bg-card/20 backdrop-blur-md">
            <PackageIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40 animate-bounce" />
            <p className="text-base font-semibold">No package orders submitted yet.</p>
            <p className="text-xs mt-1 text-muted-foreground">Launch a campaign to begin monitoring delivery metrics.</p>
          </div>
        ) : activeOrder ? (
          /* Standalone View for Selected Order */
          renderSingleOrderDetails(activeOrder)
        ) : (
          /* Overview List of All Orders (Non-expandable cards) */
          <div className="grid gap-4">
            {orders.map((o) => renderOverviewOrderCard(o))}
          </div>
        )}
      </MotionWrapper>
    </DashboardLayout>
  );
}
