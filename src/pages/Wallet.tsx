import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Wallet as WalletIcon, CreditCard, ArrowUpCircle, Loader2, AlertCircle, ArrowDownRight, ArrowUpRight, Building2 } from "lucide-react";

interface WalletData {
  id: string; balance: number; currency: string; is_activated: boolean;
  paystack_dva_account_number: string | null; paystack_dva_bank_name: string | null;
}
const walletSelectFields = "id, balance, currency, is_activated, paystack_dva_account_number, paystack_dva_bank_name";
interface WalletTx { id: string; amount: number; type: string; description: string | null; status: string; created_at: string; }
interface WalletFunctionResponse { wallet?: WalletData; authorization_url?: string; reference?: string; error?: string; details?: { message?: string }; }

const parseResponse = (payload: unknown): WalletFunctionResponse | null => {
  if (!payload) return null;
  if (typeof payload === "string") { try { return JSON.parse(payload); } catch { return null; } }
  return typeof payload === "object" ? (payload as WalletFunctionResponse) : null;
};

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
    // Resolve advertiser's category, then fetch global + category-specific activation fee
    const { data: advCat } = await supabase
      .from("advertiser_categories")
      .select("category_id")
      .eq("advertiser_id", user.id)
      .maybeSingle();
    const categoryFeeKey = advCat?.category_id ? `category_activation_fee:${advCat.category_id}` : null;
    const keys = ["activation_fee_usd", "usd_to_ngn_rate", ...(categoryFeeKey ? [categoryFeeKey] : [])];
    const { data: settings } = await supabase.from("admin_settings").select("key, value").in("key", keys);
    if (settings) {
      let globalFee: number | null = null;
      let categoryFee: number | null = null;
      settings.forEach((s: { key: string; value: string }) => {
        if (s.key === "activation_fee_usd") globalFee = Number(s.value);
        else if (s.key === "usd_to_ngn_rate") setExchangeRate(Number(s.value));
        else if (categoryFeeKey && s.key === categoryFeeKey) categoryFee = Number(s.value);
      });
      const finalFee = categoryFee !== null ? categoryFee : globalFee;
      if (finalFee !== null) { setActivationFee(finalFee); setActivationAmount(String(finalFee)); }
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
    } catch (err: unknown) { toast.error((err as Error).message || "Failed to initialize activation"); } finally { setActivating(false); }
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
    } catch (err: unknown) { toast.error((err as Error).message || "Failed to initialize funding"); } finally { setFunding(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <MotionWrapper>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Wallet</h1>
            <p className="text-sm text-muted-foreground">Manage your balance and payment methods</p>
          </div>
        </MotionWrapper>

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <>
            {/* Balance Card */}
            <MotionWrapper delay={0.05}>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <WalletIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Available Balance</p>
                      <p className="text-3xl font-semibold text-foreground">${wallet?.balance?.toFixed(2) || "0.00"}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={wallet?.is_activated ? "text-primary border-primary/20 bg-primary/5" : "text-amber-600 border-amber-500/20 bg-amber-500/5"}>
                    {wallet?.is_activated ? "Active" : "Not Activated"}
                  </Badge>
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
                      <Label className="text-xs text-muted-foreground">Amount (USD) — min ${activationFee}</Label>
                      <Input type="number" min={activationFee} step="1" value={activationAmount || String(activationFee)} onChange={(e) => setActivationAmount(e.target.value)} />
                      {Number(activationAmount || activationFee) > 0 && <p className="text-[10px] text-muted-foreground">= NGN {(Number(activationAmount || activationFee) * exchangeRate).toLocaleString()}</p>}
                    </div>
                    <Button onClick={handleActivate} disabled={activating} className="w-full sm:w-auto">
                      {activating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><CreditCard className="mr-2 h-4 w-4" /> Pay to Activate</>}
                    </Button>
                  </div>
                </div>
              </MotionWrapper>
            )}

            {/* Fund Wallet */}
            {wallet?.is_activated && (
              <MotionWrapper delay={0.1}>
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="text-sm font-medium text-foreground mb-1">Fund Wallet</h3>
                  <p className="text-xs text-muted-foreground mb-4">Add funds via Paystack</p>
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                    <div className="flex-1 space-y-1.5 w-full">
                      <Label className="text-xs text-muted-foreground">Amount (USD)</Label>
                      <Input type="number" min="1" step="1" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} placeholder="Enter amount" />
                      {fundAmount && Number(fundAmount) > 0 && <p className="text-[10px] text-muted-foreground">= NGN {(Number(fundAmount) * exchangeRate).toLocaleString()}</p>}
                    </div>
                    <Button onClick={handleFund} disabled={funding} className="w-full sm:w-auto">
                      {funding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowUpCircle className="mr-2 h-4 w-4" /> Fund</>}
                    </Button>
                  </div>
                </div>
              </MotionWrapper>
            )}

            {/* DVA Info */}
            {wallet?.paystack_dva_account_number && (
              <MotionWrapper delay={0.15}>
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">Virtual Account</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-xs text-muted-foreground">Bank</p><p className="font-medium text-foreground">{wallet.paystack_dva_bank_name}</p></div>
                    <div><p className="text-xs text-muted-foreground">Account Number</p><p className="font-mono font-medium text-foreground">{wallet.paystack_dva_account_number}</p></div>
                  </div>
                </div>
              </MotionWrapper>
            )}

            {/* Transactions */}
            <MotionWrapper delay={0.2}>
              <div className="rounded-xl border border-border bg-card">
                <div className="p-5 pb-3">
                  <h3 className="text-sm font-medium text-foreground">Transaction History</h3>
                </div>
                <div className="px-5 pb-5">
                  {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tx.type === "charge" ? "bg-destructive/10" : "bg-primary/10"}`}>
                              {tx.type === "charge" ? <ArrowDownRight className="h-4 w-4 text-destructive" /> : <ArrowUpRight className="h-4 w-4 text-primary" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground capitalize">{tx.type}</p>
                              <p className="text-xs text-muted-foreground truncate">{tx.description || "—"}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className={`text-sm font-medium ${tx.type === "charge" ? "text-destructive" : "text-primary"}`}>
                              {tx.type === "charge" ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </MotionWrapper>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
