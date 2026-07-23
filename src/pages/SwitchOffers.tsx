import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Loader2, Zap, ArrowRight, Wallet as WalletIcon, ClipboardList } from "lucide-react";
import MigrationChart from "@/components/MigrationChart";

type Offer = {
  id: string; title: string; description: string | null;
  competitor_app_id: string | null; advertiser_subtypes: string[];
  platform: string; batch_size: number; flat_price_usd: number;
  target_link_required: boolean; is_active: boolean;
};
type Competitor = { id: string; name: string; logo_url: string | null };
type Order = {
  id: string; offer_title: string; competitor_app_name: string | null;
  batch_size: number; flat_price_usd: number; target_link: string | null;
  status: string; users_delivered: number; created_at: string;
};

export default function SwitchOffers() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [competitors, setCompetitors] = useState<Record<string, Competitor>>({});
  const [subtype, setSubtype] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Offer | null>(null);
  const [link, setLink] = useState("");
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: cat }, { data: w }, { data: comps }, { data: offs }, { data: ord }] = await Promise.all([
        supabase.from("advertiser_categories").select("advertiser_subtype").eq("advertiser_id", user.id).maybeSingle(),
        supabase.from("wallets").select("balance").eq("advertiser_id", user.id).maybeSingle(),
        supabase.from("competitor_apps" as any).select("id,name,logo_url").eq("is_active", true),
        supabase.from("switch_offers" as any).select("*").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("switch_offer_orders" as any).select("*").eq("advertiser_id", user.id).order("created_at", { ascending: false }),
      ]);
      setSubtype((cat as any)?.advertiser_subtype || null);
      setBalance(Number((w as any)?.balance || 0));
      const cmap: Record<string, Competitor> = {};
      ((comps as any) || []).forEach((c: Competitor) => { cmap[c.id] = c; });
      setCompetitors(cmap);
      setOffers((offs as any) || []);
      setOrders((ord as any) || []);
      setLoading(false);
    })();
  }, [user?.id]);

  const visible = useMemo(() =>
    subtype ? offers.filter((o) => (o.advertiser_subtypes || []).includes(subtype)) : [],
    [offers, subtype]);

  const buy = async () => {
    if (!selected) return;
    if (selected.target_link_required && !link.trim()) return toast.error("Enter your target app link");
    if (balance < selected.flat_price_usd) return toast.error("Insufficient wallet balance");
    setBuying(true);
    const { error } = await supabase.rpc("purchase_switch_offer" as any, {
      _offer_id: selected.id, _target_link: link.trim() || null,
    });
    setBuying(false);
    if (error) return toast.error(error.message);
    toast.success("Offer purchased — delivery starting");
    setSelected(null); setLink("");
    // reload
    const { data: w } = await supabase.from("wallets").select("balance").eq("advertiser_id", user!.id).maybeSingle();
    const { data: ord } = await supabase.from("switch_offer_orders" as any).select("*").eq("advertiser_id", user!.id).order("created_at", { ascending: false });
    setBalance(Number((w as any)?.balance || 0));
    setOrders((ord as any) || []);
  };

  return (
    <DashboardLayout>
      <MotionWrapper>
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Switch Offers</h1>
            <p className="text-sm text-muted-foreground">Ready-to-run batches of users switching from competitor apps to yours.</p>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-1.5 text-xs">
            <WalletIcon className="inline h-3.5 w-3.5 mr-1" /> Balance: <span className="font-medium">${balance.toFixed(2)}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            {!subtype ? (
              <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
                <p>Set your subcategory to see offers tailored to you.</p>
                <Link to="/category-select" className="mt-3 inline-block text-primary underline">Choose subcategory →</Link>
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
                <Zap className="mx-auto mb-2 h-8 w-8 opacity-40" />
                No switch offers for your category yet — check back soon.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((o) => {
                  const c = o.competitor_app_id ? competitors[o.competitor_app_id] : null;
                  return (
                    <div key={o.id} className="rounded-xl border bg-card p-5 flex flex-col">
                      <div className="flex items-center gap-3">
                        {c?.logo_url ? (
                          <img src={c.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                            <Zap className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold leading-tight">{o.title}</p>
                          {c && <p className="text-[11px] text-muted-foreground">From {c.name}</p>}
                        </div>
                      </div>
                      {o.description && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{o.description}</p>}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-muted-foreground">Batch</p>
                          <p className="font-medium text-sm">{o.batch_size.toLocaleString()} users</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-muted-foreground">Flat price</p>
                          <p className="font-medium text-sm">${Number(o.flat_price_usd).toFixed(2)}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="mt-3 capitalize text-[10px] self-start">{o.platform}</Badge>
                      <Button className="mt-4" onClick={() => { setSelected(o); setLink(""); }}>
                        Switch now <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {orders.length > 0 && (
              <div className="mt-10">
                <div className="mb-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  <h2 className="text-base font-semibold">My switch orders</h2>
                </div>
                <div className="grid gap-3">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-lg border bg-card p-4 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{o.offer_title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {o.competitor_app_name && `from ${o.competitor_app_name} · `}
                            {o.users_delivered.toLocaleString()} / {o.batch_size.toLocaleString()} users delivered · ${Number(o.flat_price_usd).toFixed(2)}
                          </p>
                          {o.target_link && <p className="text-[11px] text-muted-foreground truncate">→ {o.target_link}</p>}
                        </div>
                        <Badge variant="outline" className="capitalize text-[10px]">{o.status.replace(/_/g, " ")}</Badge>
                      </div>
                      <MigrationChart switchOrderId={o.id} title="Where these users came from" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </MotionWrapper>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected?.title}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Batch</span><span className="font-medium">{selected.batch_size.toLocaleString()} users</span></div>
                <div className="flex justify-between mt-1"><span className="text-muted-foreground">Total</span><span className="font-semibold">${Number(selected.flat_price_usd).toFixed(2)}</span></div>
              </div>
              {selected.target_link_required && (
                <div>
                  <Label>Your app / target link</Label>
                  <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">Paid from wallet (balance ${balance.toFixed(2)}).</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={buy} disabled={buying || !selected || balance < (selected?.flat_price_usd || 0)}>
              {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay $${selected?.flat_price_usd.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
