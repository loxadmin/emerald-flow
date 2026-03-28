import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";

interface Advertiser {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  website: string | null;
  created_at: string;
  category?: { name: string; status: string } | null;
  wallet?: { balance: number; is_activated: boolean } | null;
}

export default function AdminAdvertisers() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (!profiles) { setLoading(false); return; }

      const ids = profiles.map(p => p.id);
      const [catRes, walletRes] = await Promise.all([
        supabase.from("advertiser_categories").select("advertiser_id, status, categories(name)").in("advertiser_id", ids),
        supabase.from("wallets").select("advertiser_id, balance, is_activated").in("advertiser_id", ids),
      ]);

      const catMap = new Map<string, { name: string; status: string }>();
      (catRes.data || []).forEach((ac: any) => {
        catMap.set(ac.advertiser_id, { name: ac.categories?.name || "Unknown", status: ac.status });
      });

      const walletMap = new Map<string, { balance: number; is_activated: boolean }>();
      (walletRes.data || []).forEach((w: any) => {
        walletMap.set(w.advertiser_id, { balance: w.balance, is_activated: w.is_activated });
      });

      const merged: Advertiser[] = profiles.map((p) => ({
        ...p,
        category: catMap.get(p.id) || null,
        wallet: walletMap.get(p.id) || null,
      }));

      setAdvertisers(merged);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <AdminLayout>
      <MotionWrapper className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Advertisers</h1>
          <p className="text-muted-foreground">View all registered advertisers and their status</p>
        </div>

        <GlassCard variant="strong">
          <GlassCardHeader><GlassCardTitle>All Advertisers ({advertisers.length})</GlassCardTitle></GlassCardHeader>
          <GlassCardContent>
            {loading ? (
              <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : advertisers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No advertisers yet</p>
            ) : (
              <div className="space-y-2">
                {advertisers.map((adv) => (
                  <div key={adv.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border/50 p-4 gap-2">
                    <div>
                      <p className="font-medium text-foreground">{adv.full_name || "No name"}</p>
                      <p className="text-sm text-muted-foreground">{adv.email}</p>
                      {adv.website && <p className="text-xs text-muted-foreground/60">{adv.website}</p>}
                      {adv.company_name && <p className="text-xs text-muted-foreground/60">{adv.company_name}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {adv.category ? (
                        <>
                          <Badge variant="outline" className="text-xs">{adv.category.name}</Badge>
                          <Badge variant="outline" className={
                            adv.category.status === "active" ? "border-primary/30 bg-primary/10 text-primary text-xs" :
                            "border-warning/30 bg-warning/10 text-warning text-xs"
                          }>
                            {adv.category.status}
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="outline" className="border-muted text-muted-foreground text-xs">No category</Badge>
                      )}
                      {adv.wallet ? (
                        <Badge variant="outline" className={
                          adv.wallet.is_activated ? "border-primary/30 bg-primary/10 text-primary text-xs" :
                          "border-destructive/30 bg-destructive/10 text-destructive text-xs"
                        }>
                          ${adv.wallet.balance.toFixed(2)} {adv.wallet.is_activated ? "Active" : "Inactive"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-muted text-muted-foreground text-xs">No wallet</Badge>
                      )}
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
