import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";

type Affiliate = {
  id: string; code: string; full_name: string; status: string;
  balance_usd: number; withdrawable: boolean; qualify_deadline: string; closed_at: string | null;
};
type Referral = {
  id: string; advertiser_email: string | null; status: string; deadline: string;
  first_deposit_usd: number | null; bonus_usd: number; commission_usd: number; created_at: string;
};
type Earning = { id: string; type: string; amount_usd: number; description: string | null; created_at: string };
type Withdrawal = { id: string; amount_usd: number; method: string; status: string; created_at: string };

const money = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));

export default function AffiliateDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) { navigate("/login", { replace: true }); return; }

    const { data: aff } = await supabase.from("affiliates").select("*").eq("user_id", uid).maybeSingle();
    if (!aff) { navigate("/affiliates", { replace: true }); return; }
    setAffiliate(aff as Affiliate);

    const [{ data: refs }, { data: earns }, { data: wds }] = await Promise.all([
      supabase.from("affiliate_referrals").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }),
      supabase.from("affiliate_earnings").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }),
      supabase.from("affiliate_withdrawals").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }),
    ]);
    setReferrals((refs || []) as Referral[]);
    setEarnings((earns || []) as Earning[]);
    setWithdrawals((wds || []) as Withdrawal[]);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const link = affiliate ? `${window.location.origin}/?ref=${affiliate.code}` : "";

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast.success("Affiliate link copied");
  };

  const withdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("request_affiliate_withdrawal", {
        _amount: Number(amount),
        _method: method,
        _destination: { details },
      });
      if (error) throw error;
      toast.success("Withdrawal requested");
      setAmount(""); setDetails("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }
  if (!affiliate) return null;

  const qualified = referrals.filter((r) => r.status === "qualified").length;
  const closed = affiliate.status === "closed";

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-10">
        <Link to="/" className="flex items-center gap-2">
          <Logo size={20} />
          <span className="text-sm font-bold text-gradient">Karbali Affiliates</span>
        </Link>
        <button className="text-sm text-muted-foreground hover:text-primary" onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}>
          Log out
        </button>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8 sm:px-10">
        {closed ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5">
            <p className="font-semibold text-destructive">Affiliate account closed</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No paying advertiser was referred within 30 days, so this affiliate account was closed and the welcome bonus forfeited.
            </p>
          </div>
        ) : !affiliate.withdrawable ? (
          <div className="rounded-xl border border-border bg-muted/40 p-5">
            <p className="font-semibold">Bonus locked — {daysLeft(affiliate.qualify_deadline)} days left</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Refer one advertiser who funds their wallet and gets a campaign live before the deadline to unlock your $50 and keep your account.
            </p>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Balance</p>
            <p className="mt-1 text-2xl font-bold">{money(affiliate.balance_usd)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Qualified referrals</p>
            <p className="mt-1 text-2xl font-bold">{qualified}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total referrals</p>
            <p className="mt-1 text-2xl font-bold">{referrals.length}</p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold">Your affiliate link</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={link} className="h-11 rounded-lg font-mono text-xs" />
            <div className="flex gap-2">
              <GlassButton type="button" onClick={copy} className="h-11 rounded-lg px-4"><Copy className="mr-2 h-4 w-4" />Copy</GlassButton>
              <a href={link} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm">
                <ExternalLink className="mr-2 h-4 w-4" />Open
              </a>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Code: <span className="font-mono">{affiliate.code}</span> — anyone who signs up after visiting this link is tied to you automatically.</p>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold">Referred advertisers</p>
          {referrals.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No referrals yet. Share your link to get started.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Advertiser</th><th>Status</th><th>First deposit</th><th>Earned</th><th>Deadline</th></tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-2">{r.advertiser_email || "—"}</td>
                      <td className="capitalize">{r.status}</td>
                      <td>{r.first_deposit_usd ? money(r.first_deposit_usd) : "—"}</td>
                      <td>{money(Number(r.bonus_usd) + Number(r.commission_usd))}</td>
                      <td>{r.status === "pending" ? `${daysLeft(r.deadline)} days left` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">Earnings</p>
            <ul className="mt-3 space-y-2 text-sm">
              {earnings.length === 0 && <li className="text-muted-foreground">Nothing yet.</li>}
              {earnings.map((e) => (
                <li key={e.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <span className="text-muted-foreground">{e.description || e.type}</span>
                  <span className="font-medium">{money(e.amount_usd)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">Withdraw</p>
            {!affiliate.withdrawable || closed ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Withdrawals unlock after your first qualified referral.
              </p>
            ) : (
              <form onSubmit={withdraw} className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wd-amount" className="text-sm">Amount (USD)</Label>
                  <Input id="wd-amount" type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="h-11 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wd-method" className="text-sm">Method</Label>
                  <select id="wd-method" value={method} onChange={(e) => setMethod(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm">
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="crypto">Crypto (USDT)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wd-details" className="text-sm">Payout details</Label>
                  <Input id="wd-details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Account number / wallet address" required className="h-11 rounded-lg" />
                </div>
                <GlassButton type="submit" variant="glow" className="h-11 w-full rounded-lg" disabled={submitting}>
                  {submitting ? "Requesting..." : "Request withdrawal"}
                </GlassButton>
              </form>
            )}
            {withdrawals.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm">
                {withdrawals.map((w) => (
                  <li key={w.id} className="flex items-center justify-between text-muted-foreground">
                    <span>{money(w.amount_usd)} — {w.method.replace("_", " ")}</span>
                    <span className="capitalize">{w.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
