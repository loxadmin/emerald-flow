import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import { TrendingUp, Users } from "lucide-react";

type Row = {
  id: string;
  source_name: string;
  source_type: string;
  users_migrated: number;
  migration_date: string;
};

type Props = {
  campaignId?: string;
  packageOrderId?: string;
  switchOrderId?: string;
  title?: string;
  emptyHint?: string;
};

/** Advertiser-facing chart: "where users are migrating from" */
export default function MigrationChart({
  campaignId, packageOrderId, switchOrderId,
  title = "User migration sources",
  emptyHint = "As delivery progresses, you'll see where users are switching from.",
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase.from("campaign_migrations" as any).select("id,source_name,source_type,users_migrated,migration_date");
      if (campaignId) q = q.eq("campaign_id", campaignId);
      else if (packageOrderId) q = q.eq("package_order_id", packageOrderId);
      else if (switchOrderId) q = q.eq("switch_order_id", switchOrderId);
      else { setRows([]); setLoading(false); return; }
      const { data } = await q.order("migration_date", { ascending: true });
      if (!cancelled) { setRows(((data as any) || []) as Row[]); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [campaignId, packageOrderId, switchOrderId]);

  const bySource = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => { m[r.source_name] = (m[r.source_name] || 0) + r.users_migrated; });
    return Object.entries(m).map(([name, users]) => ({ name, users })).sort((a, b) => b.users - a.users);
  }, [rows]);

  const byDay = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => {
      const k = new Date(r.migration_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      m[k] = (m[k] || 0) + r.users_migrated;
    });
    return Object.entries(m).map(([date, users]) => ({ date, users }));
  }, [rows]);

  const total = bySource.reduce((s, x) => s + x.users, 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> {title}
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Live migration data recorded by our operations team.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="text-sm font-semibold tabular-nums">{total.toLocaleString()} users</p>
        </div>
      </div>

      {loading ? (
        <div className="h-56 animate-pulse bg-muted/30" />
      ) : rows.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">{emptyHint}</p>
        </div>
      ) : (
        <div className="grid gap-4 p-4 md:grid-cols-2">
          {/* Bar chart: users per source */}
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">By source</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bySource} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{
                    background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
                    borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="users" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Area chart: daily migrations */}
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Daily</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={byDay} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="migG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
                    borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))",
                  }}
                />
                <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={1.5} fill="url(#migG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Table summary */}
          <div className="md:col-span-2 rounded-lg border bg-muted/20 p-3">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Breakdown</p>
            <ul className="grid gap-1 sm:grid-cols-2 md:grid-cols-3 text-xs">
              {bySource.map((s) => (
                <li key={s.name} className="flex items-center justify-between rounded-md bg-background px-2.5 py-1.5 border">
                  <span className="truncate">{s.users.toLocaleString()} users from <b>{s.name}</b></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
