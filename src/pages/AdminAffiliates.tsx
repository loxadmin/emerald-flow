import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassButton } from "@/components/ui/glass-button";

type Affiliate = {
  id: string; code: string; full_name: string; email: string; status: string;
  balance_usd: number; withdrawable: boolean; qualify_deadline: string; created_at: string;
};
type Withdrawal = {
  id: string; affiliate_id: string; amount_usd: number; method: string;
  destination: Record<string, unknown> | null; status: string; created_at: string;
};

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;

export default function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: affs }, { data: wds }] = await Promise.all([
      supabase.from("affiliates").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliate_withdrawals").select("*").order("created_at", { ascending: false }),
    ]);
    setAffiliates((affs || []) as Affiliate[]);
    setWithdrawals((wds || []) as unknown as Withdrawal[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (w: Withdrawal, approve: boolean) => {
    const { error } = await supabase
      .from("affiliate_withdrawals")
      .update({ status: approve ? "paid" : "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", w.id);
    if (error) { toast.error(error.message); return; }

    if (!approve) {
      const aff = affiliates.find((a) => a.id === w.affiliate_id);
      if (aff) {
        await supabase.from("affiliates")
          .update({ balance_usd: Number(aff.balance_usd) + Number(w.amount_usd) })
          .eq("id", aff.id);
      }
    }
    toast.success(approve ? "Marked as paid" : "Rejected and refunded");
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Affiliates</h1>
          <p className="text-sm text-muted-foreground">Affiliate accounts, balances and payout requests.</p>
        </div>

        {loading ? (
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        ) : (
          <>
            <section className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold">Pending withdrawals</p>
              {withdrawals.filter((w) => w.status === "pending").length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">None pending.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {withdrawals.filter((w) => w.status === "pending").map((w) => (
                    <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-2 text-sm">
                      <span>{money(w.amount_usd)} — {w.method.replace("_", " ")} — {String((w.destination as { details?: string } | null)?.details ?? "")}</span>
                      <div className="flex gap-2">
                        <GlassButton onClick={() => review(w, true)} className="h-9 rounded-lg px-3">Mark paid</GlassButton>
                        <button onClick={() => review(w, false)} className="h-9 rounded-lg border border-border px-3 text-sm">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="overflow-x-auto rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold">All affiliates</p>
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Name</th><th>Email</th><th>Code</th><th>Status</th><th>Balance</th><th>Unlocked</th></tr>
                </thead>
                <tbody>
                  {affiliates.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="py-2">{a.full_name || "—"}</td>
                      <td>{a.email}</td>
                      <td className="font-mono text-xs">{a.code}</td>
                      <td className="capitalize">{a.status.replace(/_/g, " ")}</td>
                      <td>{money(a.balance_usd)}</td>
                      <td>{a.withdrawable ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
