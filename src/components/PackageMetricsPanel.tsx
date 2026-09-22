import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import { Users, TrendingUp, DollarSign, ArrowRightLeft, CheckCircle2, ShieldCheck, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Milestone = { id: string; name: string; slug: string; requires_duration: boolean };
type Delivery = {
  id: string; order_id: string; milestone_id?: string | null; delivery_date: string;
  users_delivered: number; charged_usd?: number | null; fresh_users?: number | null;
  engagement_metrics?: any; competitor_breakdown?: any;
  swift_action_key?: string | null;
  txn_rows?: any;
};

type Props = {
  order: {
    id: string; units: number; duration_days?: number | null;
    total_amount_usd: number;
    escrow_spent_usd?: number | null;
    refunded_usd?: number | null;
    refunded_at?: string | null;
    selected_milestone_ids?: string[] | null;
    starts_at?: string | null;
    ends_at?: string | null;
    package_type?: string | null;
    swift_actions?: any[] | null;
  };
  milestones: Milestone[];
  deliveries: Delivery[];
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function PackageMetricsPanel({ order, milestones, deliveries }: Props) {
  const [competitorNames, setCompetitorNames] = useState<Record<string, string>>({});

  const rows = useMemo(
    () => deliveries.filter((d) => d.order_id === order.id),
    [deliveries, order.id]
  );

  useEffect(() => {
    const ids = Array.from(
      new Set(
        rows.flatMap((d) =>
          Array.isArray(d.competitor_breakdown)
            ? d.competitor_breakdown.map((c: any) => c.competitor_app_id)
            : []
        )
      )
    ).filter(Boolean);
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("competitor_apps" as any)
        .select("id,name")
        .in("id", ids);
      const map: Record<string, string> = {};
      ((data as any) || []).forEach((c: any) => { map[c.id] = c.name; });
      setCompetitorNames(map);
    })();
  }, [rows]);

  const milestoneById = (id: string) => milestones.find((m) => m.id === id);

  const getMetricName = (d: Delivery): string => {
    if (d.milestone_id) {
      const m = milestoneById(d.milestone_id);
      if (m?.name) return m.name;
    }
    if (d.swift_action_key) {
      if (d.swift_action_key === "acquisition") return "Users acquired";
      const sa = (order.swift_actions || []).find((a: any) => a.key === d.swift_action_key);
      if (sa?.name) return sa.name;
      return d.swift_action_key.replace(/_/g, " ");
    }
    return "Users delivered";
  };

  const seriesKeys = useMemo(() => {
    const set = new Set<string>();

    if (order.package_type === "swift" || (order.swift_actions || []).length > 0) {
      set.add("Users acquired");
      (order.swift_actions || []).forEach((a: any) => {
        if (a.name) set.add(a.name);
      });
    }

    (order.selected_milestone_ids || []).forEach((id) => {
      const m = milestoneById(id);
      if (m?.name) set.add(m.name);
    });

    rows.forEach((d) => {
      set.add(getMetricName(d));
    });

    const list = Array.from(set).filter(Boolean);
    return list.length > 0 ? list : ["Users delivered"];
  }, [order, milestones, rows]);

  // Daily line chart: prefilled timeline dates with delivered counts
  const dailySeries = useMemo(() => {
    const byDate: Record<string, any> = {};

    if (order.starts_at) {
      const startDate = new Date(order.starts_at);
      const daysCount = Math.max(Number(order.duration_days) || 7, 7);
      for (let i = 0; i < daysCount; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const k = iso(d);
        byDate[k] = { date: fmtDate(k), _k: k };
        seriesKeys.forEach((key) => {
          byDate[k][key] = 0;
        });
      }
    }

    rows.forEach((d) => {
      const key = String(d.delivery_date).slice(0, 10);
      byDate[key] = byDate[key] || { date: fmtDate(key), _k: key };
      seriesKeys.forEach((k) => {
        if (byDate[key][k] === undefined) byDate[key][k] = 0;
      });
      const metricName = getMetricName(d);
      byDate[key][metricName] = (byDate[key][metricName] || 0) + (d.users_delivered || 0);
    });

    return Object.values(byDate).sort((a: any, b: any) => (a._k < b._k ? -1 : 1));
  }, [rows, order.starts_at, order.duration_days, seriesKeys]);

  // Engagement bar chart
  const engagementSeries = useMemo(() => {
    const byDate: Record<string, any> = {};
    rows.forEach((d) => {
      const em = d.engagement_metrics;
      if (!em || typeof em !== "object") return;
      const key = String(d.delivery_date).slice(0, 10);
      byDate[key] = byDate[key] || { date: fmtDate(key), _k: key, Opened: 0, Active: 0, Posted: 0 };
      byDate[key].Opened += Number(em.opens || 0);
      byDate[key].Active += Number(em.active_users || 0);
      byDate[key].Posted += Number(em.posts || 0);
    });
    return Object.values(byDate).sort((a: any, b: any) => (a._k < b._k ? -1 : 1));
  }, [rows]);

  // Source breakdown: fresh vs each competitor
  const sourceSeries = useMemo(() => {
    const totals: Record<string, number> = {};
    let fresh = 0;
    rows.forEach((d) => {
      fresh += Number(d.fresh_users || 0);
      if (Array.isArray(d.competitor_breakdown)) {
        d.competitor_breakdown.forEach((c: any) => {
          const name = competitorNames[c.competitor_app_id] || "Competitor";
          totals[name] = (totals[name] || 0) + Number(c.users_count || 0);
        });
      }
    });
    const list = Object.entries(totals).map(([source, users]) => ({ source, users }));
    if (fresh > 0) list.unshift({ source: "Fresh users", users: fresh });
    return list;
  }, [rows, competitorNames]);

  // Dynamic KPI computations
  const totalDelivered = useMemo(() => {
    return rows.reduce((s, d) => s + (d.users_delivered || 0), 0);
  }, [rows]);

  const targetUnits = Math.max(order.units, 1);
  const deliveryPct = Math.min(100, Math.round((totalDelivered / targetUnits) * 100));

  const spent = Number(order.escrow_spent_usd || 0);
  const total = Number(order.total_amount_usd || 0);
  const remaining = Math.max(total - spent, 0);

  // Calculate today's / latest activity
  const todayKey = iso(new Date());
  const todayDeliveries = rows.filter((d) => String(d.delivery_date).slice(0, 10) === todayKey);

  const todayTransactedCount = useMemo(() => {
    const targetSet = todayDeliveries.length > 0 ? todayDeliveries : rows;
    return targetSet.reduce((acc, d) => {
      if (Array.isArray(d.txn_rows)) return acc + d.txn_rows.length;
      const m = d.milestone_id ? milestoneById(d.milestone_id) : null;
      if (m && (m.slug === "transaction" || m.slug === "sale")) return acc + (d.users_delivered || 0);
      return acc;
    }, 0);
  }, [todayDeliveries, rows]);

  const axis = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };
  const tooltipStyle = {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 11,
  };
  const palette = [
    "hsl(160, 84%, 39%)",
    "hsl(199, 89%, 48%)",
    "hsl(38, 92%, 50%)",
    "hsl(280, 81%, 60%)",
    "hsl(340, 82%, 52%)",
  ];

  return (
    <div className="space-y-6">
      {/* Orderly High-Contrast Bento Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Total Delivered */}
        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Users Acquired</span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-foreground">{totalDelivered.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground font-mono">/ {order.units.toLocaleString()}</span>
            </div>
            <div className="mt-2.5 space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                <span>Progress</span>
                <span className="text-primary font-mono">{deliveryPct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${deliveryPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Acquisition Migration Breakdown */}
        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source Breakdown</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
          </div>
          <div>
            {sourceSeries.length > 0 ? (
              <div className="space-y-1.5">
                {sourceSeries.slice(0, 2).map((item) => (
                  <div key={item.source} className="flex items-center justify-between text-xs font-medium">
                    <span className="text-foreground truncate max-w-[130px] font-semibold">{item.users.toLocaleString()} users</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[110px]">from {item.source}</span>
                  </div>
                ))}
                {sourceSeries.length > 2 && (
                  <p className="text-[10px] text-primary font-semibold font-mono">+ {sourceSeries.length - 2} other sources</p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-foreground">Awaiting delivery</p>
                <p className="text-[10px] text-muted-foreground mt-1">Competitor migration tracking active</p>
              </div>
            )}
          </div>
        </div>

        {/* Metric 3: Today's App Conversions */}
        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today's Activity</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold font-mono text-emerald-500">{todayTransactedCount.toLocaleString()}</span>
              <span className="text-xs font-medium text-foreground">users</span>
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground mt-1">
              {todayTransactedCount > 0 ? "transacted on your app so far today" : "active activity recorded so far"}
            </p>
          </div>
        </div>

        {/* Metric 4: Escrow & Wallet */}
        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Escrow Status</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">In Escrow</p>
                <p className="text-lg font-bold font-mono text-primary">${remaining.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Spent</p>
                <p className="text-xs font-bold font-mono text-foreground">${spent.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-2 border-t border-border/20 pt-1.5 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>Funded: ${total.toFixed(2)}</span>
              <span>{order.refunded_at ? "Refunded" : "Active"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily delivery line chart */}
      <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-border/20 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight">Daily Delivery & Conversion Trends</h3>
            <p className="text-[11px] text-muted-foreground">Daily user acquisitions and milestone conversions over time</p>
          </div>
          {dailySeries.length > 0 && (
            <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 border-border">
              {dailySeries.length} timeline days
            </Badge>
          )}
        </div>
        {dailySeries.length > 0 ? (
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={dailySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="date" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
              {seriesKeys.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={palette[i % palette.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: palette[i % palette.length] }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-xs text-muted-foreground font-medium">
            No delivery timeline recorded yet.
          </div>
        )}
      </div>

      {/* Engagement bar chart */}
      {engagementSeries.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border/20 pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-tight">App Engagement per Day</h3>
              <p className="text-[11px] text-muted-foreground">Daily active users, app opens, and posts</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={engagementSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="date" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Opened" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Active" fill="hsl(var(--primary))" fillOpacity={0.6} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Posted" fill="hsl(var(--muted-foreground))" fillOpacity={0.5} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Where users came from */}
      {sourceSeries.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border/20 pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-tight">Competitor Source Migration</h3>
              <p className="text-[11px] text-muted-foreground">Detailed breakdown of acquired user origins</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(140, sourceSeries.length * 36)}>
            <BarChart data={sourceSeries} layout="vertical" margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} opacity={0.2} />
              <XAxis type="number" tick={axis} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="source" tick={axis} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="users" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
