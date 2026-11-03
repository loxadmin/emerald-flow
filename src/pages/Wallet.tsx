import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Wallet as WalletIcon,
  CreditCard,
  ArrowUpCircle,
  Loader2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  RotateCcw,
  Send,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ListSkeleton, StatsSkeleton } from "@/components/skeletons";
import { friendlyError } from "@/lib/errors";

interface WalletData {
  id: string; balance: number; bonus_usd: number; currency: string; is_activated: boolean;
  paystack_dva_account_number: string | null; paystack_dva_bank_name: string | null;
}
const walletSelectFields = "id, balance, bonus_usd, currency, is_activated, paystack_dva_account_number, paystack_dva_bank_name";
interface WalletTx { id: string; amount: number; type: string; description: string | null; status: string; created_at: string; reference: string | null; }
interface WalletFunctionResponse { wallet?: WalletData; authorization_url?: string; reference?: string; error?: string; details?: { message?: string }; }

const parseResponse = (payload: unknown): WalletFunctionResponse | null => {
  if (!payload) return null;
  if (typeof payload === "string") { try { return JSON.parse(payload); } catch { return null; } }
  return typeof payload === "object" ? (payload as WalletFunctionResponse) : null;
};

type StatusKey = "completed" | "pending" | "failed" | "declined" | "stopped" | "refunded" | "unknown";

const normalizeStatus = (raw: string | null | undefined): StatusKey => {
  const s = (raw || "").toLowerCase().trim();
  if (["completed", "success", "successful", "paid", "settled"].includes(s)) return "completed";
  if (["pending", "processing", "initiated", "queued"].includes(s)) return "pending";
  if (["failed", "error", "unsuccessful"].includes(s)) return "failed";
  if (["declined", "rejected"].includes(s)) return "declined";
  if (["stopped", "cancelled", "canceled", "aborted"].includes(s)) return "stopped";
  if (["refunded", "reversed"].includes(s)) return "refunded";
  return "unknown";
};

const STATUS_META: Record<StatusKey, { label: string; className: string; Icon: typeof Clock }> = {
  completed: { label: "Successful", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20", Icon: CheckCircle2 },
  pending:   { label: "Pending",    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20", Icon: Clock },
  failed:    { label: "Failed",     className: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20", Icon: XCircle },
  declined:  { label: "Declined",   className: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20", Icon: Ban },
  stopped:   { label: "Stopped",    className: "bg-muted text-muted-foreground border border-border", Icon: Ban },
  refunded:  { label: "Refunded",   className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20", Icon: RotateCcw },
  unknown:   { label: "Unknown",    className: "bg-muted text-muted-foreground border border-border", Icon: Clock },
};

const TYPE_LABEL: Record<string, string> = {
  charge: "Charge",
  debit: "Debit",
  funding: "Wallet Funding",
  topup: "Top-up",
  activation: "Activation",
  refund: "Refund",
  escrow_topup: "Escrow Top-up",
  escrow_refund: "Escrow Refund",
  placement_fee: "Placement Fee",
  bonus: "Bonus",
};

const isOutflow = (type: string) => ["charge", "debit", "escrow_topup"].includes(type);

export default function WalletPage() {
  const { user, refreshAccessState } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [activationFee, setActivationFee] = useState<number | null>(null);
  const [exchangeRate, setExchangeRate] = useState(1500);
  const [activationAmount, setActivationAmount] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | StatusKey>("all");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<"suggest" | "form">("suggest");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("bank_transfer");
  const [withdrawBank, setWithdrawBank] = useState("");
  const [withdrawAccount, setWithdrawAccount] = useState("");
  const [withdrawName, setWithdrawName] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const openWithdraw = () => { setWithdrawStep("suggest"); setWithdrawAmount(""); setWithdrawOpen(true); };

  const submitWithdrawal = async () => {
    const amt = Number(withdrawAmount);
    const available = Math.max(Number(wallet?.balance || 0) - Number(wallet?.bonus_usd || 0), 0);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > available) { toast.error(`You can only withdraw up to $${available.toFixed(2)} (escrow and bonus campaign credit are locked)`); return; }
    if (!withdrawBank.trim() || !withdrawAccount.trim() || !withdrawName.trim()) { toast.error("Bank name, account number and account name are required"); return; }
    setWithdrawing(true);
    const destination = { bank: withdrawBank.trim(), account_number: withdrawAccount.trim(), account_name: withdrawName.trim() };
    const { data, error } = await supabase.rpc("request_withdrawal" as never, { _amount: amt, _method: withdrawMethod, _destination: destination } as never);
    setWithdrawing(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("Withdrawal request submitted. Our team will process it shortly.");
    const reqId = (data as { id?: string })?.id;
    if (reqId) supabase.functions.invoke("notify", { body: { event: "withdrawal_requested", payload: { request_id: reqId } } }).catch(() => {});
    setWithdrawOpen(false);
    fetchData();
  };


  const fetchData = async () => {
    if (!user) return;
    const { data: existingWallet } = await supabase.from("wallets").select(walletSelectFields).eq("advertiser_id", user.id).maybeSingle();
    let walletData: WalletData | null = existingWallet as WalletData | null;
    if (!walletData) {
      const { data: newWallet, error } = await supabase.functions.invoke("paystack-wallet", { body: { action: "create_wallet" } });
      if (error) { toast.error("Failed to create wallet"); setLoading(false); return; }
      walletData = parseResponse(newWallet)?.wallet ?? null;
    }
    if (walletData) setWallet(walletData);
    if (walletData) {
      const { data: txData } = await supabase.from("wallet_transactions").select("*").eq("wallet_id", walletData.id).order("created_at", { ascending: false }).limit(50);
      setTransactions((txData as WalletTx[]) || []);
    }
    const { data: settings } = await supabase.from("admin_settings").select("key, value").in("key", ["activation_fee_usd", "usd_to_ngn_rate"]);
    if (settings) {
      settings.forEach((s: { key: string; value: string }) => {
        if (s.key === "activation_fee_usd") { const v = Number(s.value); setActivationFee(v); setActivationAmount(String(v)); }
        else if (s.key === "usd_to_ngn_rate") setExchangeRate(Number(s.value));
      });
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trxref = params.get("trxref") || params.get("reference") || params.get("ref");
    const isActivated = params.get("activated") === "true";
    const isFunded = params.get("funded") === "true";
    // Bounce back to /packages if this funding was for a package purchase
    const returnTo = sessionStorage.getItem("karbali_return_to");
    if (isFunded && returnTo) {
      sessionStorage.removeItem("karbali_return_to");
      window.location.href = returnTo;
      return;
    }
    if (trxref || isActivated || isFunded) {
      const verifyAndRefresh = async () => {
        if (trxref) {
          toast.info("Verifying payment...");
          try {
            const { data, error } = await supabase.functions.invoke("paystack-verify", { body: { reference: trxref } });
            if (error) { toast.error("Could not verify payment."); } else {
              const payload = typeof data === "string" ? JSON.parse(data) : data;
              if (payload?.success || payload?.already_processed) toast.success("Payment verified!");
              else toast.error(payload?.error || "Payment verification failed");
            }
          } catch (e) { console.error("Verify exception:", e); }
        } else { toast.success("Refreshing wallet status..."); }
        await fetchData();
        await refreshAccessState();
      };
      void verifyAndRefresh();
      window.history.replaceState({}, "", "/wallet");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleActivate = async () => {
    const amount = Number(activationAmount);
    if (activationFee === null) { toast.error("Loading settings, please wait..."); return; }
    if (!amount || amount < activationFee) { toast.error(`Minimum activation amount is $${activationFee}`); return; }
    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-wallet", { body: { action: "initialize_activation", amount, callback_origin: window.location.origin } });
      if (error) throw error;
      const payload = parseResponse(data);
      if (payload?.authorization_url) { window.location.href = payload.authorization_url; return; }
      throw new Error(payload?.error || payload?.details?.message || "Payment gateway error");
    } catch (err: unknown) { toast.error(friendlyError(err, "Failed to initialize activation")); } finally { setActivating(false); }
  };

  const handleFund = async () => {
    const amount = Number(fundAmount);
    if (!amount || amount < 1) { toast.error("Enter a valid amount (minimum $1)"); return; }
    setFunding(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-wallet", { body: { action: "initialize_funding", amount, callback_origin: window.location.origin } });
      if (error) throw error;
      const payload = parseResponse(data);
      if (payload?.authorization_url) { window.location.href = payload.authorization_url; setFundAmount(""); return; }
      throw new Error(payload?.error || payload?.details?.message || "Payment gateway error");
    } catch (err: unknown) { toast.error(friendlyError(err, "Failed to initialize funding")); } finally { setFunding(false); }
  };

  const copy = async (label: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(label); toast.success(`${label} copied`); setTimeout(() => setCopied(null), 1500); }
    catch { toast.error("Copy failed"); }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: transactions.length };
    transactions.forEach(t => { const k = normalizeStatus(t.status); c[k] = (c[k] || 0) + 1; });
    return c;
  }, [transactions]);

  const filtered = filter === "all" ? transactions : transactions.filter(t => normalizeStatus(t.status) === filter);

  const fmtMoney = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => new Date(s).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  const withdrawable = Math.max(Number(wallet?.balance || 0) - Number(wallet?.bonus_usd || 0), 0);

  const filterTabs: Array<{ key: "all" | StatusKey; label: string }> = [
    { key: "all", label: "All" },
    { key: "completed", label: "Successful" },
    { key: "pending", label: "Pending" },
    { key: "failed", label: "Failed" },
    { key: "declined", label: "Declined" },
    { key: "stopped", label: "Stopped" },
    { key: "refunded", label: "Refunded" },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <MotionWrapper>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <p className="eyebrow">Wallet</p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Funds & transactions</h1>
              <p className="text-sm text-muted-foreground">Manage your balance, top up instantly, and review every movement.</p>
            </div>
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Secured by Paystack
            </div>
          </div>
        </MotionWrapper>

        {loading ? (
          <div className="space-y-4"><StatsSkeleton count={3} /><ListSkeleton rows={5} className="rounded-xl border border-border bg-card" /></div>
        ) : (
          <>
            {/* Balance Card — embossed fintech surface */}
            <MotionWrapper delay={0.05}>
              <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white shadow-lg ring-1 ring-white/5"
                   style={{
                     background:
                       "radial-gradient(120% 120% at 100% 0%, hsl(160 78% 22%) 0%, hsl(160 84% 12%) 55%, hsl(220 30% 6%) 100%)",
                   }}>
                <div className="absolute inset-0 opacity-[0.18] mix-blend-overlay pointer-events-none"
                     style={{
                       backgroundImage:
                         "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                       backgroundSize: "32px 32px",
                     }} />
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
                <div className="absolute -left-12 -bottom-16 h-48 w-48 rounded-full bg-emerald-300/10 blur-3xl pointer-events-none" />

                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-2 text-white/70">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 backdrop-blur">
                      <WalletIcon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-[0.18em]">Available balance</span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider backdrop-blur ${
                    wallet?.is_activated ? "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/30" : "bg-amber-400/90 text-amber-950"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${wallet?.is_activated ? "bg-emerald-300 animate-pulse" : "bg-amber-700"}`} />
                    {wallet?.is_activated ? "Active" : "Not activated"}
                  </span>
                </div>

                <div className="relative mt-8 flex items-baseline gap-1.5">
                  <span className="text-2xl font-light text-white/60">$</span>
                  <span className="font-mono text-5xl sm:text-6xl font-semibold tracking-tight tabular-nums">
                    {fmtMoney(Number(wallet?.balance || 0))}
                  </span>
                  <span className="ml-1.5 text-xs font-medium text-white/50 uppercase tracking-wider">{wallet?.currency || "USD"}</span>
                </div>

                {Number(wallet?.bonus_usd || 0) > 0 && (
                  <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur">
                    <Gift className="h-3 w-3 text-emerald-300" />
                    Includes ${fmtMoney(Number(wallet?.bonus_usd))} bonus campaign credit — spendable on campaigns only, not withdrawable
                  </p>
                )}

                <div className="relative mt-8 flex flex-wrap items-end justify-between gap-3 text-[11px]">
                  <div className="space-y-1">
                    <p className="text-white/50 uppercase tracking-[0.14em]">NGN equivalent</p>
                    <p className="font-mono text-sm text-white/90 tabular-nums">
                      ₦ {(Number(wallet?.balance || 0) * exchangeRate).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-white/50 uppercase tracking-[0.14em]">Account</p>
                    <p className="font-mono text-sm text-white/90 tracking-[0.2em]">KARBALI · {(user?.id || "").slice(0, 4).toUpperCase()}</p>
                  </div>
                </div>
              </div>
            </MotionWrapper>

            {/* Activation */}
            {!wallet?.is_activated && activationFee !== null && (
              <MotionWrapper delay={0.1}>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Activate Your Wallet</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        A minimum of ${activationFee} (NGN {(activationFee * exchangeRate).toLocaleString()}) is required. This amount is added to your balance.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                    <div className="flex-1 space-y-1.5 w-full">
                      <Label className="text-xs text-muted-foreground">Amount (USD), min ${activationFee}</Label>
                      <Input type="number" min={activationFee} step="1" value={activationAmount || String(activationFee)} onChange={(e) => setActivationAmount(e.target.value)} />
                      {Number(activationAmount || activationFee) > 0 && <p className="text-[10px] text-muted-foreground">= NGN {(Number(activationAmount || activationFee) * exchangeRate).toLocaleString()}</p>}
                    </div>
                    <Button onClick={handleActivate} disabled={activating} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
                      {activating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><CreditCard className="mr-2 h-4 w-4" /> Pay to Activate</>}
                    </Button>
                  </div>
                </div>
              </MotionWrapper>
            )}

            {/* Fund + Virtual Account side by side on larger screens */}
            <div className="grid gap-4 sm:grid-cols-2">
              {wallet?.is_activated && (
                <MotionWrapper delay={0.1}>
                  <div className="h-full rounded-xl border border-border bg-card p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-sm font-medium text-foreground">Fund Wallet</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">Top up instantly via Paystack</p>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Amount (USD)</Label>
                        <Input type="number" min="1" step="1" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} placeholder="Enter amount" />
                        {fundAmount && Number(fundAmount) > 0 && <p className="text-[10px] text-muted-foreground">= NGN {(Number(fundAmount) * exchangeRate).toLocaleString()}</p>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[10, 25, 50, 100, 250].map(v => (
                          <button key={v} type="button" onClick={() => setFundAmount(String(v))}
                            className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:bg-accent transition-colors">
                            ${v}
                          </button>
                        ))}
                      </div>
                      <Button onClick={handleFund} disabled={funding} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                        {funding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowUpCircle className="mr-2 h-4 w-4" /> Fund Wallet</>}
                      </Button>
                      <Button onClick={openWithdraw} variant="outline" className="w-full">
                        <Send className="mr-2 h-4 w-4" /> Request withdrawal
                      </Button>
                    </div>
                  </div>
                </MotionWrapper>
              )}

              {wallet?.paystack_dva_account_number && (
                <MotionWrapper delay={0.15}>
                  <div className="h-full rounded-xl border border-border bg-card p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-foreground">Virtual Account</h3>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Bank Transfer</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">Send money to this account to fund your wallet automatically.</p>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bank</p>
                          <p className="text-sm font-medium text-foreground truncate">{wallet.paystack_dva_bank_name}</p>
                        </div>
                        <button onClick={() => copy("Bank", wallet.paystack_dva_bank_name || "")} className="text-muted-foreground hover:text-foreground transition-colors p-1.5">
                          {copied === "Bank" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Account Number</p>
                          <p className="text-base font-mono font-semibold tracking-wider text-foreground">{wallet.paystack_dva_account_number}</p>
                        </div>
                        <button onClick={() => copy("Account number", wallet.paystack_dva_account_number || "")} className="text-muted-foreground hover:text-foreground transition-colors p-1.5">
                          {copied === "Account number" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </MotionWrapper>
              )}
            </div>

            {/* Transactions */}
            <MotionWrapper delay={0.2}>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
                  <div>
                    <p className="eyebrow mb-0.5">Activity</p>
                    <h3 className="text-base font-semibold tracking-tight">Transaction history</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Last 50 movements on this wallet</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{filtered.length} of {transactions.length}</span>
                </div>

                {/* Status filter tabs */}
                <div className="px-6 pb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
                  {filterTabs.map(t => {
                    const active = filter === t.key;
                    const count = counts[t.key] || 0;
                    return (
                      <button key={t.key} onClick={() => setFilter(t.key)}
                        className={`shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                          active
                            ? "bg-foreground text-background border-foreground"
                            : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}>
                        {t.label}
                        {count > 0 && (
                          <span className={`rounded-sm px-1 text-[10px] tabular-nums ${active ? "bg-background/20" : "bg-background/70 text-foreground/70"}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="px-2 sm:px-3 pb-3">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">No transactions in this view</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {filtered.map((tx) => {
                        const status = normalizeStatus(tx.status);
                        const meta = STATUS_META[status];
                        const StatusIcon = meta.Icon;
                        const out = isOutflow(tx.type);
                        const dim = status === "failed" || status === "declined" || status === "stopped";
                        return (
                          <div key={tx.id} className="flex items-center justify-between gap-3 px-3 py-3.5 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`relative flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${
                                out ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              } ${dim ? "opacity-60" : ""}`}>
                                {out ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium text-foreground">{TYPE_LABEL[tx.type] || tx.type.replace(/_/g, " ")}</p>
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.className}`}>
                                    <StatusIcon className="h-3 w-3" />
                                    {meta.label}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate max-w-[220px] sm:max-w-md">
                                  {tx.description || (tx.reference ? `Ref: ${tx.reference}` : "No description")}
                                </p>
                                <p className="text-[10px] text-muted-foreground/80 mt-0.5">{fmtDate(tx.created_at)}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-sm font-semibold tabular-nums ${
                                dim ? "text-muted-foreground line-through" : out ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                              }`}>
                                {out ? "-" : "+"}${fmtMoney(Math.abs(Number(tx.amount)))}
                              </p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{wallet?.currency || "USD"}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </MotionWrapper>
          </>
        )}
      </div>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-md">
          {withdrawStep === "suggest" ? (
            <>
              <DialogHeader>
                <DialogTitle>Before you withdraw</DialogTitle>
                <DialogDescription>
                  Your funds work harder inside Karbali. Would you like to use them for a campaign or ad package instead?
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                Available for withdrawal: <span className="font-semibold text-foreground">${Number(wallet?.balance || 0).toFixed(2)}</span>. Funds locked in escrow for active campaigns cannot be withdrawn.
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button asChild variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link to="/packages">Use for a campaign</Link>
                </Button>
                <Button variant="outline" onClick={() => setWithdrawStep("form")}>No, withdraw funds</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Request withdrawal</DialogTitle>
                <DialogDescription>
                  You can withdraw up to <strong>${Number(wallet?.balance || 0).toFixed(2)}</strong>. Escrow funds are not withdrawable.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount (USD)</Label>
                  <Input type="number" min="1" max={Number(wallet?.balance || 0)} step="0.01" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="e.g. 50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Payout method</Label>
                  <select value={withdrawMethod} onChange={(e) => setWithdrawMethod(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="bank_transfer">Bank transfer (NGN)</option>
                    <option value="paystack">Paystack</option>
                    <option value="flutterwave">Flutterwave</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bank name</Label>
                  <Input value={withdrawBank} onChange={(e) => setWithdrawBank(e.target.value)} placeholder="e.g. GTBank" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Account number</Label>
                  <Input value={withdrawAccount} onChange={(e) => setWithdrawAccount(e.target.value)} placeholder="10-digit account number" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Account name</Label>
                  <Input value={withdrawName} onChange={(e) => setWithdrawName(e.target.value)} placeholder="Account holder name" />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setWithdrawStep("suggest")}>Back</Button>
                <Button onClick={submitWithdrawal} disabled={withdrawing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {withdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
