import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
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

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
  }, []);

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
                  <div key={w.id} className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                    <div>
                      <p className="font-medium text-foreground">{w.profile?.full_name || w.profile?.email || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{w.profile?.email}</p>
                      {w.paystack_dva_account_number && (
                        <p className="text-xs text-muted-foreground/60">DVA: {w.paystack_dva_account_number}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">${Number(w.balance).toFixed(2)}</p>
                      <Badge variant="outline" className={
                        w.is_activated ? "border-primary/30 bg-primary/10 text-primary text-xs" :
                        "border-warning/30 bg-warning/10 text-warning text-xs"
                      }>
                        {w.is_activated ? "Activated" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      </MotionWrapper>
    </AdminLayout>
  );
}
