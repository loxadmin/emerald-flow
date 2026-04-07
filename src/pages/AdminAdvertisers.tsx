import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";

interface Advertiser {
  id: string; email: string; full_name: string | null; company_name: string | null;
  website: string | null; created_at: string;
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
      (catRes.data || []).forEach((ac: any) => { catMap.set(ac.advertiser_id, { name: ac.categories?.name || "Unknown", status: ac.status }); });
      const walletMap = new Map<string, { balance: number; is_activated: boolean }>();
      (walletRes.data || []).forEach((w: any) => { walletMap.set(w.advertiser_id, { balance: w.balance, is_activated: w.is_activated }); });
      setAdvertisers(profiles.map(p => ({ ...p, category: catMap.get(p.id) || null, wallet: walletMap.get(p.id) || null })));
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <AdminLayout>
      <MotionWrapper className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Advertisers</h1>
          <p className="text-sm text-muted-foreground">All registered advertisers and their status</p>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="p-5 pb-3">
            <h3 className="text-sm font-medium text-foreground">All Advertisers ({advertisers.length})</h3>
          </div>
          <div className="px-5 pb-5">
            {loading ? (
              <div className="flex justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : advertisers.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-4">No advertisers yet</p>
            ) : (
              <div className="divide-y divide-border">
                {advertisers.map((adv) => (
                  <div key={adv.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{adv.full_name || "No name"}</p>
                      <p className="text-xs text-muted-foreground">{adv.email}</p>
                      {adv.company_name && <p className="text-xs text-muted-foreground/60">{adv.company_name}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {adv.category ? (
                        <>
                          <Badge variant="outline" className="text-[10px]">{adv.category.name}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${adv.category.status === "active" ? "bg-primary/10 text-primary border-primary/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                            {adv.category.status}
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">No category</Badge>
                      )}
                      {adv.wallet ? (
                        <Badge variant="outline" className={`text-[10px] ${adv.wallet.is_activated ? "bg-primary/10 text-primary border-primary/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                          ${adv.wallet.balance.toFixed(2)} {adv.wallet.is_activated ? "Active" : "Inactive"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">No wallet</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </MotionWrapper>
    </AdminLayout>
  );
}
