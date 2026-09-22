import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";

type Milestone = { id: string; name: string; slug: string; requires_duration: boolean };
type Delivery = {
  id: string; order_id: string; milestone_id?: string | null; delivery_date: string;
  users_delivered: number; charged_usd?: number | null; fresh_users?: number | null;
  engagement_metrics?: any; competitor_breakdown?: any;
  swift_action_key?: string | null;
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

    // 1. Prefill timeline if starts_at is available
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

    // 2. Populate actual delivery rows
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

  const spent = Number(order.escrow_spent_usd || 0);
  const total = Number(order.total_amount_usd || 0);
  const remaining = Math.max(total - spent, 0);

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
    <div className="space-y-4">
      {/* Escrow summary */}
      <div className="grid gap-3 sm:grid-cols-4 rounded-lg border border-border/40 bg-secondary/10 p-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Escrow funded</p>
          <p className="text-sm font-bold font-mono text-foreground">${total.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Spent on delivery</p>
          <p className="text-sm font-bold font-mono text-foreground">${spent.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Still in escrow</p>
          <p className="text-sm font-bold font-mono text-primary">${remaining.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Refunded to wallet</p>
          <p className="text-sm font-bold font-mono text-foreground">
            {order.refunded_at ? `$${Number(order.refunded_usd || 0).toFixed(2)}` : "On completion"}
          </p>
        </div>
      </div>

      {/* Daily delivery line chart */}
      <div className="rounded-lg border border-border/40 bg-secondary/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Daily Delivery Trend
          </p>
          {dailySeries.length > 0 && (
            <p className="text-[10px] font-mono text-muted-foreground">
              {dailySeries.length} timeline days
            </p>
          )}
        </div>
        {dailySeries.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailySeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="date" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
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
          <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
            No delivery timeline active yet.
          </div>
        )}
      </div>

      {/* Engagement bar chart */}
      {engagementSeries.length > 0 && (
        <div className="rounded-lg border border-border/40 bg-secondary/10 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            App engagement per day
          </p>
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
        <div className="rounded-lg border border-border/40 bg-secondary/10 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Where your users came from
          </p>
          <ResponsiveContainer width="100%" height={Math.max(140, sourceSeries.length * 36)}>
            <BarChart data={sourceSeries} layout="vertical" margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} opacity={0.2} />
              <XAxis type="number" tick={axis} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="source" tick={axis} axisLine={false} tickLine={false} width={110} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="users" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
