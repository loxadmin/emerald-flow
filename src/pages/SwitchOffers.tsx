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
import { Loader2, Zap, ArrowRight, Wallet as WalletIcon, ClipboardList, Sparkles, Check } from "lucide-react";
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
                    <div key={o.id} className="group relative rounded-2xl border border-border bg-card/30 backdrop-blur-md p-6 flex flex-col hover:bg-card/50 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 premium-shadow">
                      {/* Decorative corner glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 pointer-events-none" />

                      {/* Top Header Section */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {c?.logo_url ? (
                            <img src={c.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover border border-border shadow-inner" />
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                              <Zap className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-extrabold text-base text-foreground leading-snug truncate group-hover:text-primary transition-colors">{o.title}</p>
                            {c && (
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                                Pool: {c.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize text-[9px] font-extrabold tracking-wider bg-accent/40 text-muted-foreground border-border/60 shrink-0">
                          {o.platform}
                        </Badge>
                      </div>

                      {o.description && (
                        <p className="mt-4 text-xs leading-relaxed text-muted-foreground line-clamp-3 min-h-[3.25rem]">
                          {o.description}
                        </p>
                      )}

                      {/* Grid Data display with precise cards */}
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-accent/15 p-3.5 border border-border/40 space-y-0.5">
                          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Cohort Batch</p>
                          <p className="font-extrabold text-sm text-foreground font-mono">{o.batch_size.toLocaleString()}</p>
                        </div>
                        <div className="rounded-xl bg-accent/15 p-3.5 border border-border/40 space-y-0.5">
                          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Acquisition Cost</p>
                          <p className="font-extrabold text-sm text-foreground font-mono">${Number(o.flat_price_usd).toFixed(2)}</p>
                        </div>
                      </div>

                      {/* High hierarchy checkmark highlights */}
                      <div className="mt-5 space-y-2 flex-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Key Highlights</p>
                        <ul className="space-y-1.5">
                          <li className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>Guaranteed competitive switchers</span>
                          </li>
                          <li className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>Instant webhook synchronization</span>
                          </li>
                        </ul>
                      </div>

                      <Button
                        className="mt-6 w-full font-bold shadow-md shadow-primary/5 hover:shadow-primary/15 hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 py-5 rounded-xl flex items-center justify-center gap-2"
                        onClick={() => { setSelected(o); setLink(""); }}
                      >
                        Initiate Transition <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Premium "My Switch Orders" and charts section */}
            {orders.length > 0 && (
              <div className="mt-16 border-t border-border/40 pt-12">
                <div className="mb-8 flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/25 shadow-sm">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">Active Cohort Transitions</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Track live user migration status and platform distribution details.</p>
                  </div>
                </div>
                <div className="grid gap-6">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-2xl border border-border/80 bg-card/30 backdrop-blur-md p-6 space-y-6 premium-shadow">
                      <div className="flex items-start justify-between gap-4 flex-wrap border-b border-border/40 pb-5">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-lg font-extrabold text-foreground tracking-tight">{o.offer_title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {o.competitor_app_name && (
                              <span className="font-bold text-foreground">
                                From: {o.competitor_app_name}
                              </span>
                            )}
                            <span className="text-border/60">•</span>
                            <span>Price: <span className="font-bold text-foreground font-mono">${Number(o.flat_price_usd).toFixed(2)}</span></span>
                            <span className="text-border/60">•</span>
                            <span>Batch: <span className="font-bold text-foreground font-mono">{o.batch_size.toLocaleString()} users</span></span>
                          </div>
                          {o.target_link && (
                            <p className="text-[10px] font-mono text-muted-foreground truncate max-w-xl mt-2 bg-background/50 border border-border/60 rounded-lg px-2.5 py-1 inline-block">
                              → Destination: <a href={o.target_link} target="_blank" rel="noreferrer" className="text-primary hover:underline">{o.target_link}</a>
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="capitalize text-[10px] font-extrabold px-3 py-1 bg-primary/10 border-primary/20 text-primary">
                          {o.status.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <div className="bg-background/25 rounded-xl border border-border/40 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Migration Progress</span>
                          <span className="text-xs font-bold text-foreground font-mono">
                            {o.users_delivered.toLocaleString()} / {o.batch_size.toLocaleString()} ({Math.min(100, Math.round((o.users_delivered / o.batch_size) * 100))}% completed)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden border border-border/40">
                          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${Math.min(100, (o.users_delivered / o.batch_size) * 100)}%` }} />
                        </div>
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
        <DialogContent className="border-border/80 bg-card/95 backdrop-blur-2xl rounded-2xl p-6 md:p-8 max-w-md premium-shadow">
          <DialogHeader className="border-b border-border/40 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl text-primary border border-primary/20">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                  Confirm Switch Request
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Transition campaign activation</p>
              </div>
            </div>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              {selected.description && <p className="text-xs leading-relaxed text-muted-foreground">{selected.description}</p>}

              <div className="rounded-xl border border-border bg-accent/10 p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Switch Target Batch</span>
                  <span className="font-extrabold text-foreground font-mono">{selected.batch_size.toLocaleString()} users</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/40">
                  <span className="text-muted-foreground font-semibold">Total Acquisition Price</span>
                  <span className="font-extrabold text-foreground font-mono">${Number(selected.flat_price_usd).toFixed(2)}</span>
                </div>
              </div>

              {selected.target_link_required && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground">Target Destination link</Label>
                  <Input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://..."
                    className="rounded-xl border-border bg-background/50 h-11 text-xs"
                  />
                </div>
              )}
              <p className="text-[10px] leading-relaxed text-muted-foreground font-medium">
                Payment is debited directly from your corporate wallet (balance: <span className="font-bold text-foreground">${balance.toFixed(2)}</span>).
              </p>
            </div>
          )}
          <DialogFooter className="mt-6 border-t border-border/40 pt-4 gap-2">
            <Button variant="outline" className="rounded-xl font-bold border-border/85 text-xs h-11" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={buy} className="rounded-xl font-extrabold shadow-md shadow-primary/20 text-xs h-11" disabled={buying || !selected || balance < (selected?.flat_price_usd || 0)}>
              {buying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {buying ? "Processing..." : `Authorize Transition: $${selected?.flat_price_usd.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
