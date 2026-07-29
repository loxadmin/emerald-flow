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
import { Loader2, Zap, ArrowRight, Wallet as WalletIcon, ClipboardList, Sparkles } from "lucide-react";
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
        {/* Page Topbar Header */}
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Switch Offers</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Acquire active user cohorts ready to migrate from direct competitors to your brand.</p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs font-bold text-foreground flex items-center gap-2 shadow-sm">
            <WalletIcon className="h-4 w-4 text-primary animate-pulse" />
            <span>Corporate Balance: <span className="text-primary tabular-nums text-sm font-extrabold ml-1">${balance.toFixed(2)}</span></span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            {!subtype ? (
              <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground bg-card/20 backdrop-blur-md">
                <p className="text-base font-semibold">Set your subcategory to see tailored user acquisition campaigns.</p>
                <Link to="/category-select" className="mt-3.5 inline-block text-primary underline font-bold hover:text-primary/90">Choose Subcategory →</Link>
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground bg-card/20 backdrop-blur-md">
                <Zap className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-base font-semibold">No active switch offers for your category currently.</p>
                <p className="text-xs mt-1 text-muted-foreground">Our operations team updates competitor user pools daily.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((o) => {
                  const c = o.competitor_app_id ? competitors[o.competitor_app_id] : null;
                  return (
                    <div key={o.id} className="group relative rounded-2xl border border-border bg-card/40 backdrop-blur-md p-6 flex flex-col hover:bg-card hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 premium-shadow">
                      {/* Badge top indicator */}
                      <div className="absolute top-4 right-4 text-primary bg-primary/10 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>

                      <div className="flex items-center gap-3.5">
                        {c?.logo_url ? (
                          <img src={c.logo_url} alt="" className="h-11 w-11 rounded-xl object-cover border border-border shadow-sm" />
                        ) : (
                          <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <Zap className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-base text-foreground leading-snug truncate">{o.title}</p>
                          {c && <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Pool: {c.name}</p>}
                        </div>
                      </div>

                      {o.description && <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground line-clamp-3 min-h-[3.25rem]">{o.description}</p>}

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-accent/25 p-3 border border-border/40">
                          <p className="text-muted-foreground font-medium">Cohort Batch</p>
                          <p className="font-bold text-sm mt-0.5 text-foreground">{o.batch_size.toLocaleString()} users</p>
                        </div>
                        <div className="rounded-xl bg-accent/25 p-3 border border-border/40">
                          <p className="text-muted-foreground font-medium">Flat Price</p>
                          <p className="font-bold text-sm mt-0.5 text-foreground">${Number(o.flat_price_usd).toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="mt-4.5 flex items-center justify-between">
                        <Badge variant="outline" className="capitalize text-[10px] font-bold bg-background/50 border-border/80">
                          {o.platform} Pool
                        </Badge>
                      </div>

                      <Button className="mt-5 w-full font-semibold shadow-md group-hover:bg-primary/95 group-hover:scale-[1.01] transition-all" onClick={() => { setSelected(o); setLink(""); }}>
                        Switch Users <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Premium "My Switch Orders" and charts section */}
            {orders.length > 0 && (
              <div className="mt-12 border-t border-border pt-10">
                <div className="mb-6 flex items-center gap-2.5">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary border border-primary/25">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">Active Cohort Transitions</h2>
                </div>
                <div className="grid gap-5">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-2xl border border-border bg-card/40 backdrop-blur-md p-5 md:p-6 space-y-4 premium-shadow">
                      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border/40 pb-4">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-base font-bold text-foreground">{o.offer_title}</p>
                          <p className="text-xs text-muted-foreground">
                            {o.competitor_app_name && <span className="font-semibold text-foreground mr-1.5">From {o.competitor_app_name}</span>}
                            <span className="text-border">·</span>
                            <span className="font-bold text-primary ml-1.5 tabular-nums">{o.users_delivered.toLocaleString()}</span> of {o.batch_size.toLocaleString()} migrated
                            <span className="text-border mx-1.5">·</span> Price: ${Number(o.flat_price_usd).toFixed(2)}
                          </p>
                          {o.target_link && (
                            <p className="text-[11px] font-mono text-muted-foreground truncate max-w-xl mt-1.5 bg-background/50 border rounded px-2 py-0.5 inline-block">
                              → Destination: {o.target_link}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="capitalize text-[10px] font-bold px-2.5 py-0.5 bg-primary/10 border-primary/20 text-primary">
                          {o.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <MigrationChart switchOrderId={o.id} title="Real-time Migration Sources breakdown" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </MotionWrapper>

      {/* Modern Dialog Revamp */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="border-border/80 bg-card/95 backdrop-blur-2xl rounded-2xl premium-shadow">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/10 p-2 rounded-lg text-primary border border-primary/20">
                <Zap className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                Switch: {selected?.title}
              </DialogTitle>
            </div>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 mt-2">
              {selected.description && <p className="text-xs leading-relaxed text-muted-foreground">{selected.description}</p>}

              <div className="rounded-xl border border-border bg-accent/20 p-4 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Switch Target Batch</span>
                  <span className="font-bold text-foreground">{selected.batch_size.toLocaleString()} users</span>
                </div>
                <div className="flex justify-between mt-1 pt-1.5 border-t border-border/40">
                  <span className="text-muted-foreground font-semibold">Total Acquisition Price</span>
                  <span className="font-extrabold text-foreground">${Number(selected.flat_price_usd).toFixed(2)}</span>
                </div>
              </div>

              {selected.target_link_required && (
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Target Destination link</Label>
                  <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className="rounded-xl border-border bg-background" />
                </div>
              )}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Payment is debited directly from your corporate wallet (balance: <span className="font-bold">${balance.toFixed(2)}</span>).
              </p>
            </div>
          )}
          <DialogFooter className="mt-5 border-t border-border pt-4 gap-2">
            <Button variant="outline" className="rounded-xl font-semibold" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={buy} className="rounded-xl font-bold shadow-md shadow-primary/20" disabled={buying || !selected || balance < (selected?.flat_price_usd || 0)}>
              {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : `Authorize Transition: $${selected?.flat_price_usd.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
