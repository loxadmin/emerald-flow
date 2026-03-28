import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Wallet as WalletIcon, CreditCard, ArrowUpCircle, Loader2, AlertCircle } from "lucide-react";

interface WalletData {
  id: string;
  balance: number;
  currency: string;
  is_activated: boolean;
  paystack_dva_account_number: string | null;
  paystack_dva_bank_name: string | null;
}

interface WalletTx {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  status: string;
  created_at: string;
}

export default function WalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [activationFee, setActivationFee] = useState(10);
  const [exchangeRate, setExchangeRate] = useState(1500);

  const fetchData = async () => {
    if (!user) return;

    // Get or create wallet
    let { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("advertiser_id", user.id)
      .maybeSingle();

    if (!walletData) {
      // Create wallet via edge function
      const { data: newWallet, error } = await supabase.functions.invoke("paystack-wallet", {
        body: { action: "create_wallet" },
      });
      if (error) {
        toast.error("Failed to create wallet");
        setLoading(false);
        return;
      }
      walletData = newWallet?.wallet;
    }

    if (walletData) setWallet(walletData as WalletData);

    // Fetch transactions
    if (walletData) {
      const { data: txData } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", (walletData as WalletData).id)
        .order("created_at", { ascending: false })
        .limit(50);
      setTransactions((txData as WalletTx[]) || []);
    }

    // Fetch admin settings
    const { data: settings } = await supabase.from("admin_settings").select("key, value").in("key", ["activation_fee_usd", "usd_to_ngn_rate"]);
    if (settings) {
      settings.forEach((s: { key: string; value: string }) => {
        if (s.key === "activation_fee_usd") setActivationFee(Number(s.value));
        if (s.key === "usd_to_ngn_rate") setExchangeRate(Number(s.value));
      });
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-wallet", {
        body: { action: "initialize_activation" },
      });
      if (error) throw error;
      if (data?.authorization_url) {
        window.open(data.authorization_url, "_blank");
        toast.success("Payment window opened. Complete payment to activate your wallet.");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to initialize activation");
    } finally {
      setActivating(false);
    }
  };

  const handleFund = async () => {
    const amount = Number(fundAmount);
    if (!amount || amount < 1) {
      toast.error("Enter a valid amount (minimum $1)");
      return;
    }
    setFunding(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-wallet", {
        body: { action: "initialize_funding", amount },
      });
      if (error) throw error;
      if (data?.authorization_url) {
        window.open(data.authorization_url, "_blank");
        toast.success("Payment window opened. Complete payment to fund your wallet.");
        setFundAmount("");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to initialize funding");
    } finally {
      setFunding(false);
    }
  };

  const ngnAmount = activationFee * exchangeRate;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        <MotionWrapper>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Wallet</h1>
            <p className="text-muted-foreground">Manage your payment methods and balance</p>
          </div>
        </MotionWrapper>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Balance Card */}
            <MotionWrapper delay={0.1}>
              <GlassCard variant="strong">
                <GlassCardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
                      <WalletIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Available Balance</p>
                      <p className="text-3xl font-bold text-foreground">
                        ${wallet?.balance?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={wallet?.is_activated
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-warning/30 bg-warning/10 text-warning"
                    }
                  >
                    {wallet?.is_activated ? "Activated" : "Not Activated"}
                  </Badge>
                </GlassCardContent>
              </GlassCard>
            </MotionWrapper>

            {/* Activation Card (if not activated) */}
            {!wallet?.is_activated && (
              <MotionWrapper delay={0.15}>
                <GlassCard variant="strong" className="border-warning/20">
                  <GlassCardHeader>
                    <GlassCardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-warning" />
                      Activate Your Wallet
                    </GlassCardTitle>
                    <GlassCardDescription>
                      A one-time activation fee of ${activationFee} (NGN {ngnAmount.toLocaleString()}) is required
                    </GlassCardDescription>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      This activation fee will be reflected as wallet funding on your account.
                      You need an activated wallet to create campaigns.
                    </p>
                    <GlassButton variant="glow" onClick={handleActivate} disabled={activating}>
                      {activating ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                      ) : (
                        <><CreditCard className="mr-2 h-4 w-4" /> Pay ${activationFee} to Activate</>
                      )}
                    </GlassButton>
                  </GlassCardContent>
                </GlassCard>
              </MotionWrapper>
            )}

            {/* Fund Wallet */}
            {wallet?.is_activated && (
              <MotionWrapper delay={0.2}>
                <GlassCard variant="strong">
                  <GlassCardHeader>
                    <GlassCardTitle>Fund Wallet</GlassCardTitle>
                    <GlassCardDescription>Add funds to your wallet via Paystack</GlassCardDescription>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1 space-y-2">
                        <Label className="text-muted-foreground text-sm">Amount (USD)</Label>
                        <GlassInput
                          type="number"
                          min="1"
                          step="1"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          placeholder="Enter amount"
                        />
                        {fundAmount && Number(fundAmount) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            = NGN {(Number(fundAmount) * exchangeRate).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <GlassButton variant="glow" onClick={handleFund} disabled={funding}>
                        {funding ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><ArrowUpCircle className="mr-2 h-4 w-4" /> Fund</>
                        )}
                      </GlassButton>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              </MotionWrapper>
            )}

            {/* DVA Info */}
            {wallet?.paystack_dva_account_number && (
              <MotionWrapper delay={0.25}>
                <GlassCard>
                  <GlassCardHeader>
                    <GlassCardTitle>Virtual Account</GlassCardTitle>
                    <GlassCardDescription>Transfer directly to fund your wallet</GlassCardDescription>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Bank</span>
                        <span className="text-sm text-foreground font-medium">{wallet.paystack_dva_bank_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Account Number</span>
                        <span className="text-sm text-foreground font-mono font-medium">{wallet.paystack_dva_account_number}</span>
                      </div>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              </MotionWrapper>
            )}

            {/* Transaction History */}
            <MotionWrapper delay={0.3}>
              <GlassCard variant="strong">
                <GlassCardHeader>
                  <GlassCardTitle>Transaction History</GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                  {transactions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-6">No transactions yet</p>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground capitalize">{tx.type}</p>
                            <p className="text-xs text-muted-foreground">{tx.description || "No description"}</p>
                            <p className="text-xs text-muted-foreground/60">{new Date(tx.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${tx.type === "charge" ? "text-destructive" : "text-primary"}`}>
                              {tx.type === "charge" ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
                            </p>
                            <Badge variant="outline" className={
                              tx.status === "completed" ? "border-primary/30 bg-primary/10 text-primary text-xs" :
                              tx.status === "failed" ? "border-destructive/30 bg-destructive/10 text-destructive text-xs" :
                              "border-warning/30 bg-warning/10 text-warning text-xs"
                            }>
                              {tx.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCardContent>
              </GlassCard>
            </MotionWrapper>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
