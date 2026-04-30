import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import MotionWrapper from "@/components/MotionWrapper";

interface WalletWithProfile {
  id: string;
  advertiser_id: string;
  balance: number;
  is_activated: boolean;
  currency: string;
  paystack_dva_account_number: string | null;
  created_at: string;
  profile?: { email: string; full_name: string | null } | null;
}

export default function AdminWallets() {
  const [wallets, setWallets] = useState<WalletWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [topupWallet, setTopupWallet] = useState<WalletWithProfile | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchWallets = async () => {
    setLoading(true);
    const { data: walletsData } = await supabase.from("wallets").select("*").order("created_at", { ascending: false });
    if (!walletsData) { setLoading(false); return; }

    const ids = walletsData.map(w => w.advertiser_id);
    const { data: profiles } = await supabase.from("profiles").select("id, email, full_name").in("id", ids);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const merged = walletsData.map(w => ({
      ...w,
      profile: profileMap.get(w.advertiser_id) || null,
    }));

    setWallets(merged as WalletWithProfile[]);
    setTotalBalance(walletsData.reduce((sum, w) => sum + Number(w.balance), 0));
    setLoading(false);
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleTopup = async () => {
    if (!topupWallet) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive number", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-wallet-topup", {
      body: { wallet_id: topupWallet.id, amount: amt, description: note || `Admin top-up of $${amt.toFixed(2)}` },
    });
    setSubmitting(false);
    if (error || (data as { error?: string })?.error) {
      toast({ title: "Top-up failed", description: error?.message || (data as { error?: string })?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Wallet topped up", description: `Added $${amt.toFixed(2)}` });
    setTopupWallet(null);
    setAmount("");
    setNote("");
    fetchWallets();
  };

  return (
    <AdminLayout>
      <MotionWrapper className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Wallets</h1>
          <p className="text-muted-foreground">Monitor all advertiser wallets and balances</p>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <GlassCard className="glass-hover">
            <GlassCardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Wallets</p>
              <p className="text-2xl font-bold text-foreground">{wallets.length}</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard className="glass-hover">
            <GlassCardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Activated</p>
              <p className="text-2xl font-bold text-primary">{wallets.filter(w => w.is_activated).length}</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard className="glass-hover">
            <GlassCardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-bold text-foreground">${totalBalance.toFixed(2)}</p>
            </GlassCardContent>
          </GlassCard>
        </div>

        <GlassCard variant="strong">
          <GlassCardHeader><GlassCardTitle>All Wallets</GlassCardTitle></GlassCardHeader>
          <GlassCardContent>
            {loading ? (
              <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : wallets.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No wallets yet</p>
            ) : (
              <div className="space-y-2">
                {wallets.map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded-xl border border-border/50 p-4 gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{w.profile?.full_name || w.profile?.email || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground truncate">{w.profile?.email}</p>
                      {w.paystack_dva_account_number && (
                        <p className="text-xs text-muted-foreground/60">DVA: {w.paystack_dva_account_number}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">${Number(w.balance).toFixed(2)}</p>
                        <Badge variant="outline" className={
                          w.is_activated ? "border-primary/30 bg-primary/10 text-primary text-xs" :
                          "border-warning/30 bg-warning/10 text-warning text-xs"
                        }>
                          {w.is_activated ? "Activated" : "Pending"}
                        </Badge>
                      </div>
                      <Button size="sm" onClick={() => setTopupWallet(w)}>Top up</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      </MotionWrapper>

      <Dialog open={!!topupWallet} onOpenChange={(o) => { if (!o) { setTopupWallet(null); setAmount(""); setNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top up wallet</DialogTitle>
          </DialogHeader>
          {topupWallet && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p><span className="text-foreground font-medium">{topupWallet.profile?.full_name || topupWallet.profile?.email}</span></p>
                <p>Current balance: <span className="text-foreground font-medium">${Number(topupWallet.balance).toFixed(2)}</span></p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for top-up" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopupWallet(null)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleTopup} disabled={submitting}>{submitting ? "Processing..." : "Confirm top-up"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
