import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import MotionWrapper from "@/components/MotionWrapper";
import PromoMediaUpload, { offerError, type PromoMediaValue } from "@/components/PromoMediaUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";
import { Flame, Users, MessageCircle, Heart, Share2, Repeat2, Link2, Loader2, Plus } from "lucide-react";
import { PLATFORM_LABELS, roastBoostCost, roastBoostHeadline, usd, type RoastBoostPricing } from "@/lib/roast-boost";

const db = supabase as any;

type Order = {
  id: string; platform: string; page_url: string; followers: number; days: number; total_cost: number;
  escrow_balance: number; status: string; followers_delivered: number; admin_notes: string | null;
  created_at: string; ends_at: string | null;
};
type Post = { id: string; order_id: string; post_url: string; status: string; created_at: string };
type Delivery = {
  id: string; order_id: string; new_followers: number; likes: number; shares: number; reposts: number;
  comments_count: number; comments: string | null; created_at: string;
};

const STATUS: Record<string, string> = {
  pending_approval: "Awaiting approval", active: "Running", rejected: "Rejected (refunded)", completed: "Completed",
};

export default function RoastBoost() {
  const { user } = useAuth();
  const userId = user?.id;
  const [subtype, setSubtype] = useState<string | null>(null);
  const [pricing, setPricing] = useState<RoastBoostPricing | null>(null);
  const [balance, setBalance] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const [platform, setPlatform] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [followers, setFollowers] = useState(1000);
  const [days, setDays] = useState(3);
  const [media, setMedia] = useState<PromoMediaValue>({ url: null, path: null, type: null });
  const [offerText, setOfferText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newPost, setNewPost] = useState<Record<string, string>>({});

  const load = async () => {
    if (!userId) return;
    const { data: ac } = await supabase.from("advertiser_categories").select("advertiser_subtype").eq("advertiser_id", userId).maybeSingle();
    const sub = (ac as any)?.advertiser_subtype ?? null;
    setSubtype(sub);
    const [{ data: p }, { data: w }, { data: o }] = await Promise.all([
      sub ? db.from("roast_boost_pricing").select("*").eq("subtype", sub).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("wallets").select("balance").eq("advertiser_id", userId).maybeSingle(),
      db.from("roast_boost_orders").select("*").eq("advertiser_id", userId).order("created_at", { ascending: false }),
    ]);
    setPricing(p?.is_active ? p : null);
    if (p?.platforms?.length) setPlatform((cur) => cur || p.platforms[0]);
    if (p) { setFollowers((f) => Math.max(f, p.min_followers)); setDays((d) => Math.max(d, p.min_days, 3)); }
    setBalance(Number(w?.balance ?? 0));
    const list = (o ?? []) as Order[];
    setOrders(list);
    const ids = list.map((x) => x.id);
    if (ids.length) {
      const [{ data: ps }, { data: ds }] = await Promise.all([
        db.from("roast_boost_posts").select("*").in("order_id", ids).order("created_at", { ascending: false }),
        db.from("roast_boost_deliveries").select("*").in("order_id", ids).order("created_at", { ascending: false }),
      ]);
      setPosts(ps ?? []); setDeliveries(ds ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  const minDays = Math.max(3, pricing?.min_days ?? 3);
  const cost = pricing ? roastBoostCost(pricing, followers || 0, days || 0) : { follower: 0, daily: 0, total: 0 };
  const placementFee = cost.total <= 500 ? 5 : 10;
  const grandTotal = cost.total + placementFee;

  const submit = async () => {
    if (!pricing) return;
    if (!/^https?:\/\//i.test(pageUrl.trim())) return toast.error("Enter your page link, starting with https://");
    if (followers < pricing.min_followers) return toast.error(`Minimum is ${pricing.min_followers} followers`);
    if (days < minDays) return toast.error(`Minimum is ${minDays} days`);
    const oe = offerError(media, offerText);
    if (oe) return toast.error(oe);
    if (grandTotal > balance) return toast.error(`Not enough money in your wallet. Need $${grandTotal.toFixed(2)} ($${cost.total.toFixed(2)} escrow + $${placementFee.toFixed(2)} placement fee).`);
    setSubmitting(true);
    const { error } = await db.rpc("purchase_roast_boost", {
      _platform: platform, _page_url: pageUrl.trim(), _followers: followers, _days: days,
      _offer: { url: media.url, path: media.path, type: media.type, text: offerText.trim() },
    });
    setSubmitting(false);
    if (error) return toast.error(friendlyError(error));
    toast.success("Submitted. Your money is held safely until an admin approves.");
    setPageUrl(""); setOfferText(""); setMedia({ url: null, path: null, type: null });
    load();
  };

  const addPost = async (orderId: string) => {
    const url = (newPost[orderId] || "").trim();
    if (!/^https?:\/\//i.test(url)) return toast.error("Enter the post link, starting with https://");
    const { error } = await db.rpc("add_roast_boost_post", { _order_id: orderId, _post_url: url });
    if (error) return toast.error(friendlyError(error));
    toast.success("Post added. Our team will send it to your followers.");
    setNewPost((s) => ({ ...s, [orderId]: "" }));
    load();
  };

  return (
    <DashboardLayout>
      <MotionWrapper className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-primary"><Flame className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wider">Roast and Boost</span></div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{roastBoostHeadline(subtype)}</h1>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">How it works:</strong> real people follow your page, then scroll through your posts and react honestly.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>If they like a post, they like, comment, share and repost it.</li>
              <li>If they don't, they roast it in the comments. Honest reviews and a bit of controversy are still engagement and push your posts further.</li>
              <li>Post something new while your boost is running? Add the link below and the same followers will roast and boost that post too, so every post gets activity.</li>
              <li>We copy the comments to your dashboard so you can read every reaction.</li>
            </ul>
            <p>Your payment is held safely and only used as followers and engagement are delivered. If we decline your request, you get a full refund.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : !pricing ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Roast and Boost isn't available for your category yet. {!subtype && <Link to="/category" className="text-primary underline">Choose your category</Link>}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Start a Roast and Boost</h2>
            <div className="space-y-2">
              <Label>Platform</Label>
              <div className="flex flex-wrap gap-2">
                {pricing.platforms.map((p) => (
                  <button key={p} type="button" onClick={() => setPlatform(p)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${platform === p ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40"}`}>
                    {PLATFORM_LABELS[p] ?? p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rb-url">Your {PLATFORM_LABELS[platform] ?? ""} page link</Label>
              <Input id="rb-url" value={pageUrl} maxLength={500} placeholder="https://..." onChange={(e) => setPageUrl(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rb-f">How many followers?</Label>
                <Input id="rb-f" type="number" min={pricing.min_followers} step={100} value={followers} onChange={(e) => setFollowers(Math.max(0, parseInt(e.target.value) || 0))} />
                <p className="text-[11px] text-muted-foreground">{usd(pricing.price_per_1000)} per 1,000 followers. Minimum {pricing.min_followers}.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rb-d">How many days?</Label>
                <Input id="rb-d" type="number" min={minDays} value={days} onChange={(e) => setDays(Math.max(0, parseInt(e.target.value) || 0))} />
                <p className="text-[11px] text-muted-foreground">Minimum {minDays} days. Daily engagement: ${Number(pricing.daily_fee_per_user)} per follower per day.</p>
              </div>
            </div>
            <PromoMediaUpload value={media} onChange={setMedia} offerText={offerText} onOfferTextChange={setOfferText} />
            <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">{followers.toLocaleString()} followers</span><span>{usd(cost.follower)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Daily engagement ({days} days)</span><span>{usd(cost.daily)}</span></div>
              <div className="flex justify-between text-xs text-muted-foreground"><span>Placement Fee (Non-refundable)</span><span>{usd(placementFee)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground"><span>Total Charged</span><span>{usd(grandTotal)}</span></div>
              <p className="text-[11px] text-muted-foreground">Wallet balance: {usd(balance)}</p>
            </div>
            <Button className="w-full" onClick={submit} disabled={submitting || grandTotal > balance}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flame className="mr-2 h-4 w-4" />}
              {grandTotal > balance ? "Fund your wallet to continue" : `Pay ${usd(grandTotal)} and submit`}
            </Button>
          </div>
        )}

        {orders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Your Roast and Boosts</h2>
            {orders.map((o) => {
              const ps = posts.filter((p) => p.order_id === o.id);
              const ds = deliveries.filter((d) => d.order_id === o.id);
              const sum = (k: keyof Delivery) => ds.reduce((a, d) => a + Number(d[k] || 0), 0);
              const canAdd = o.status === "active" || o.status === "pending_approval";
              return (
                <div key={o.id} className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-foreground">{PLATFORM_LABELS[o.platform] ?? o.platform} · {o.followers.toLocaleString()} followers · {o.days} days</div>
                      <a href={o.page_url} target="_blank" rel="noreferrer" className="text-xs text-primary break-all">{o.page_url}</a>
                    </div>
                    <Badge variant={o.status === "rejected" ? "destructive" : "secondary"}>{STATUS[o.status] ?? o.status}</Badge>
                  </div>
                  {o.admin_notes && <p className="text-xs text-muted-foreground">Note from Karbali: {o.admin_notes}</p>}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-center">
                    {[
                      { icon: Users, label: "Followers", v: `${o.followers_delivered}/${o.followers}` },
                      { icon: Heart, label: "Likes", v: sum("likes") },
                      { icon: MessageCircle, label: "Comments", v: sum("comments_count") },
                      { icon: Share2, label: "Shares", v: sum("shares") },
                      { icon: Repeat2, label: "Reposts", v: sum("reposts") },
                    ].map((m) => (
                      <div key={m.label} className="rounded-lg bg-muted/40 p-2">
                        <m.icon className="mx-auto h-4 w-4 text-primary" />
                        <div className="text-sm font-semibold text-foreground">{m.v}</div>
                        <div className="text-[10px] text-muted-foreground">{m.label}</div>
                      </div>
                    ))}
                  </div>
                  {canAdd && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Posted something new? Add the link so your followers roast and boost it too</Label>
                      <div className="flex gap-2">
                        <Input value={newPost[o.id] || ""} maxLength={500} placeholder="https://..." onChange={(e) => setNewPost((s) => ({ ...s, [o.id]: e.target.value }))} />
                        <Button variant="secondary" onClick={() => addPost(o.id)}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}
                  {ps.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-foreground">Posts added</div>
                      {ps.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                          <a href={p.post_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary break-all"><Link2 className="h-3 w-3 shrink-0" />{p.post_url}</a>
                          <span className="shrink-0 text-muted-foreground">{p.status === "sent" ? "Sent to followers" : "Waiting"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {ds.some((d) => d.comments) && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-foreground">What people are saying</div>
                      {ds.filter((d) => d.comments).map((d) => (
                        <div key={d.id} className="rounded-lg border border-border p-3">
                          <div className="text-[10px] text-muted-foreground mb-1">{new Date(d.created_at).toLocaleString()}</div>
                          <p className="whitespace-pre-wrap text-sm text-foreground">{d.comments}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </MotionWrapper>
    </DashboardLayout>
  );
}
