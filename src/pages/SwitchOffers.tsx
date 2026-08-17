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
import SwitchStoryCard from "@/components/SwitchStoryCard";
import SwitchMetricsPanel from "@/components/SwitchMetricsPanel";
import { CardGridSkeleton } from "@/components/skeletons";
import { friendlyError } from "@/lib/errors";

/** Turns "https://www.cabally.com" into "Cabally" so offers read personally. */
function brandFrom(website?: string | null, companyName?: string | null, email?: string | null): string {
  if (companyName && companyName.trim() && companyName.trim().toLowerCase() !== "karbali") return companyName.trim();
  const raw = (website || "").trim().toLowerCase();
  if (raw) {
    const host = raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    const label = host.split(".")[0];
    if (label && label !== "karbali") return label.charAt(0).toUpperCase() + label.slice(1);
  }
  const emailBrand = (email || "").split("@")[0].trim();
  if (emailBrand) return emailBrand.charAt(0).toUpperCase() + emailBrand.slice(1);
  return "your business";
}

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
  const [brandName, setBrandName] = useState("your brand");
  const [brandLogo, setBrandLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("profiles").select("website, company_name, avatar_url").eq("id", user.id).maybeSingle();
      setBrandName(brandFrom((data as any)?.website, (data as any)?.company_name, user.email));
      setBrandLogo((data as any)?.avatar_url || null);
    })();
  }, [user?.id]);

  const [selected, setSelected] = useState<Offer | null>(null);
  const [link, setLink] = useState("");
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.id) {
        setOffers([]); setOrders([]); setCompetitors({}); setLoading(false);
        return;
      }

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
      setOffers((((offs as any) || []) as Offer[]).filter((offer) => {
        return Boolean(offer.competitor_app_id && cmap[offer.competitor_app_id]);
      }));
      setOrders(((ord as any) || []) as Order[]);
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
    if (error) return toast.error(friendlyError(error));
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
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Migration desk</p>
            <h1 className="text-[2rem] font-semibold leading-tight tracking-tight text-foreground md:text-[2.5rem]">
              Users ready to leave your competitors
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Each cohort below is a group of real users on a competing brand who are open to switching to {brandName}. Claim a cohort and we deliver them.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">Wallet balance</p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">${balance.toFixed(2)}</p>
          </div>
        </div>


        {loading ? (
          <CardGridSkeleton count={4} columns={2} />
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
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((o) => {
                  const c = o.competitor_app_id ? competitors[o.competitor_app_id] : null;
                  if (!c) return null;
                  return (
                    <SwitchStoryCard
                      key={o.id}
                      competitorName={c.name}
                      competitorLogo={c.logo_url}
                      brandName={brandName}
                      brandLogo={brandLogo}
                      count={o.batch_size}
                      price={Number(o.flat_price_usd)}
                      platform={o.platform}
                      note={o.description || o.title}
                      onAction={() => { setSelected(o); setLink(""); }}
                    />
                  );
                })}
              </div>

            )}

            {/* Premium "My Switch Orders" and charts section */}
            {orders.length > 0 && (
              <div className="mt-16 border-t border-border/20 pt-10">
                <div className="mb-6 flex items-center gap-2.5">
                  <div className="p-2.5 bg-primary/10 text-primary border border-primary/20 rounded-lg shrink-0">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-foreground">Active Cohort Transitions</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Track live user migration status and platform distribution details.</p>
                  </div>
                </div>
                <div className="grid gap-6">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-xl border border-border/40 bg-card/35 backdrop-blur-sm p-5 space-y-5 shadow-md">
                      <div className="flex items-start justify-between gap-4 flex-wrap border-b border-border/20 pb-4">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="font-semibold text-sm text-foreground tracking-tight">{o.offer_title}</p>
                          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground flex-wrap">
                            {o.competitor_app_name && (
                              <span className="font-semibold text-foreground bg-secondary/80 px-2 py-0.5 rounded border border-border/30">
                                Pool: {o.competitor_app_name}
                              </span>
                            )}
                            <span className="text-border/40">•</span>
                            <span>Acquisition Price: <span className="font-semibold text-foreground">${Number(o.flat_price_usd).toFixed(2)}</span></span>
                            <span className="text-border/40">•</span>
                            <span>Migration Cohort: <span className="font-semibold text-foreground">{o.batch_size.toLocaleString()} users</span></span>
                          </div>
                          {o.target_link && (
                            <p className="text-[10px] text-muted-foreground truncate max-w-xl mt-2 bg-secondary/35 border border-border/30 rounded px-2.5 py-1 inline-block">
                              Target App Link: <a href={o.target_link} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">{o.target_link}</a>
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="capitalize text-[10px] font-semibold px-2.5 py-0.5 bg-primary/5 border-primary/20 text-primary rounded-full">
                          {o.status.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <div className="bg-secondary/15 rounded-lg border border-border/20 p-3.5">
                        <div className="flex items-center justify-between mb-2 text-xs">
                          <span className="font-medium text-muted-foreground">Migration Progress</span>
                          <span className="font-semibold text-foreground">
                            {o.users_delivered.toLocaleString()} / {o.batch_size.toLocaleString()} ({Math.min(100, Math.round((o.users_delivered / o.batch_size) * 100))}% completed)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary/80 overflow-hidden border border-border/10">
                          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.min(100, (o.users_delivered / o.batch_size) * 100)}%` }} />
                        </div>
                      </div>

                      <SwitchMetricsPanel
                        orderId={o.id}
                        competitorName={o.competitor_app_name}
                        brandName={brandName}
                      />

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
        <DialogContent className="border-border/40 bg-card p-5 md:p-6 max-w-md rounded-lg shadow-2xl">
          <DialogHeader className="border-b border-border/20 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary border border-primary/20 rounded-lg p-2.5 shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                  Confirm Transition Offer
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Transition campaign activation</p>
              </div>
            </div>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {selected.description && <p className="text-xs leading-relaxed text-muted-foreground/80">{selected.description}</p>}

              <div className="rounded-lg border border-border/30 bg-secondary/20 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Switch Target Batch</span>
                  <span className="font-semibold text-foreground">{selected.batch_size.toLocaleString()} users</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/10">
                  <span className="text-muted-foreground font-semibold">Total Acquisition Price</span>
                  <span className="font-semibold text-foreground">${Number(selected.flat_price_usd).toFixed(2)}</span>
                </div>
              </div>

              {selected.target_link_required && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80 block">Target Destination Link</Label>
                  <Input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://..."
                    className="rounded-lg border-border/40 bg-background/50 h-9 text-xs"
                  />
                </div>
              )}
              <p className="text-[10px] leading-relaxed text-muted-foreground/60 font-medium">
                Payment is debited directly from your corporate wallet (balance: <span className="font-semibold text-foreground">${balance.toFixed(2)}</span>).
              </p>
            </div>
          )}
          <DialogFooter className="mt-5 border-t border-border/20 pt-4 gap-2">
            <Button variant="outline" className="rounded-lg font-medium border-border/80 text-xs h-9" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={buy} className="rounded-lg font-semibold text-xs h-9 shadow-none hover:bg-primary/95" disabled={buying || !selected || balance < (selected?.flat_price_usd || 0)}>
              {buying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {buying ? "Processing..." : `Authorize: $${selected?.flat_price_usd.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
