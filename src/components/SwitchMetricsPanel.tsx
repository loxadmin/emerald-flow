import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { Loader2, TrendingUp, Users, Receipt } from "lucide-react";

type Metrics = {
  users_switched: number;
  signups: number;
  kyc_completed: number;
  profiles_created: number;
  deposits_count: number;
  total_txn_amount: number;
  txn_rows: { txn_id: string; amount_usd: number }[] | null;
  notes: string | null;
  updated_at: string;
};

export default function SwitchMetricsPanel({
  orderId,
  competitorName,
  brandName,
}: {
  orderId: string;
  competitorName?: string | null;
  brandName?: string;
}) {
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("switch_order_metrics" as any)
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();
      if (!active) return;
      setM((data as any) || null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!m) {
    return (
      <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-xs text-muted-foreground">
        No delivery metrics recorded yet. They appear here as soon as your cohort is delivered.
      </div>
    );
  }

  const funnel = [
    { step: "Switched", value: m.users_switched },
    { step: "Signed up", value: m.signups },
    { step: "KYC done", value: m.kyc_completed },
    { step: "Profile created", value: m.profiles_created },
    { step: "Deposited", value: m.deposits_count },
  ];
  const txns = m.txn_rows || [];
  const avg = m.deposits_count > 0 ? Number(m.total_txn_amount) / m.deposits_count : 0;
  const conv = m.users_switched > 0 ? (m.deposits_count / m.users_switched) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border/40 bg-card p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Users switched
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {m.users_switched.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground">
            from {competitorName || "competitor"} to {brandName || "your app"}
          </p>
        </div>
        <div className="rounded-lg border border-border/40 bg-card p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Revenue generated
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            ${Number(m.total_txn_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-muted-foreground">
            across {m.deposits_count.toLocaleString()} transactions · avg ${avg.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-border/40 bg-card p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Receipt className="h-3.5 w-3.5" /> Deposit conversion
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{conv.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">of switched users transacted</p>
        </div>
      </div>

      <div className="rounded-lg border border-border/40 bg-card p-4">
        <p className="mb-3 text-xs font-semibold text-foreground">Milestone funnel</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="step" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: any) => [Number(v).toLocaleString(), "Users"]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {funnel.map((_, i) => (
                  <Cell key={i} fill={i === 4 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.45)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {txns.length > 0 && (
        <div className="rounded-lg border border-border/40 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">
              Transaction proof ({txns.length.toLocaleString()} records)
            </p>
            {txns.length > 10 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                {showAll ? "Show less" : "Show all"}
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-auto rounded border border-border/30">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-secondary/60">
                <tr>
                  <th className="px-3 py-2 font-semibold">Transaction ID</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(showAll ? txns : txns.slice(0, 10)).map((t, i) => (
                  <tr key={`${t.txn_id}-${i}`} className="border-t border-border/20">
                    <td className="px-3 py-1.5 font-mono">{t.txn_id}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      ${Number(t.amount_usd).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {m.notes && (
        <p className="text-[11px] text-muted-foreground">Delivery note: {m.notes}</p>
      )}
    </div>
  );
}
