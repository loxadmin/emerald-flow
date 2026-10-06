import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import MotionWrapper from "@/components/MotionWrapper";
import AdvertiserOfferView from "@/components/AdvertiserOfferView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/errors";
import { subtypeLabel } from "@/lib/advertiser-subtypes";
import { ALL_PLATFORMS, PLATFORM_LABELS, usd, type RoastBoostPricing } from "@/lib/roast-boost";
import { toast } from "sonner";
import { Copy, Check, X, Save, Loader2 } from "lucide-react";

const db = supabase as any;

type Order = any;
type Post = { id: string; order_id: string; post_url: string; status: string; created_at: string };

const STATUS: Record<string, string> = {
  pending_approval: "Awaiting approval", active: "Running", rejected: "Rejected", completed: "Completed",
};

function PricingRow({ p, onSaved }: { p: RoastBoostPricing; onSaved: () => void }) {
  const [v, setV] = useState(p);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (v.price_per_1000 < 0 || v.daily_fee_per_user < 0 || v.min_followers < 1 || v.min_days < 3 || !v.platforms.length)
      return toast.error("Check the values: prices can't be negative, minimum 3 days, at least one platform");
    setSaving(true);
    const { error } = await db.from("roast_boost_pricing").update({
      price_per_1000: v.price_per_1000, daily_fee_per_user: v.daily_fee_per_user, platforms: v.platforms,
      min_followers: v.min_followers, min_days: v.min_days, is_active: v.is_active, updated_at: new Date().toISOString(),
    }).eq("subtype", p.subtype);
    setSaving(false);
    if (error) return toast.error(friendlyError(error));
    toast.success(`${subtypeLabel(p.subtype)} pricing saved`);
    onSaved();
  };
  const num = (k: keyof RoastBoostPricing) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Number(e.target.value) });
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{subtypeLabel(p.subtype)}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">Available <Switch checked={v.is_active} onCheckedChange={(c) => setV({ ...v, is_active: c })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div><Label className="text-xs">$ per 1,000 followers</Label><Input type="number" step="0.01" min={0} value={v.price_per_1000} onChange={num("price_per_1000")} /></div>
        <div><Label className="text-xs">$ per follower per day</Label><Input type="number" step="0.000001" min={0} value={v.daily_fee_per_user} onChange={num("daily_fee_per_user")} /></div>
        <div><Label className="text-xs">Min followers</Label><Input type="number" min={1} value={v.min_followers} onChange={num("min_followers")} /></div>
        <div><Label className="text-xs">Min days (3+)</Label><Input type="number" min={3} value={v.min_days} onChange={num("min_days")} /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {ALL_PLATFORMS.map((pl) => {
          const on = v.platforms.includes(pl);
          return (
            <button key={pl} type="button" onClick={() => setV({ ...v, platforms: on ? v.platforms.filter((x) => x !== pl) : [...v.platforms, pl] })}
              className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              {PLATFORM_LABELS[pl]}
            </button>
          );
        })}
      </div>
      <Button size="sm" onClick={save} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" />Save</Button>
    </div>
  );
}

function DeliveryForm({ order, posts, onDone }: { order: Order; posts: Post[]; onDone: () => void }) {
  const empty = { post_id: "", new_followers: 0, likes: 0, shares: 0, reposts: 0, comments_count: 0, comments: "", amount: 0, note: "", complete: false };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const n = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Math.max(0, Number(e.target.value) || 0) });
  const submit = async () => {
    if (f.amount > Number(order.escrow_balance)) return toast.error("Amount is more than the money held");
    setBusy(true);
    const { error } = await db.rpc("record_roast_boost_delivery", {
      _order_id: order.id, _post_id: f.post_id || null, _new_followers: f.new_followers, _likes: f.likes, _shares: f.shares,
      _reposts: f.reposts, _comments_count: f.comments_count, _comments: f.comments, _amount: f.amount, _note: f.note || null, _complete: f.complete,
    });
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success("Progress logged");
    setF(empty); onDone();
  };
  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div className="text-xs font-medium text-foreground">Log progress</div>
      {posts.length > 0 && (
        <select className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={f.post_id} onChange={(e) => setF({ ...f, post_id: e.target.value })}>
          <option value="">Main page</option>
          {posts.map((p) => <option key={p.id} value={p.id}>{p.post_url}</option>)}
        </select>
      )}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[["new_followers", "New followers"], ["likes", "Likes"], ["comments_count", "Comments"], ["shares", "Shares"], ["reposts", "Reposts"], ["amount", "$ to release"]].map(([k, l]) => (
          <div key={k}><Label className="text-[10px]">{l}</Label><Input type="number" min={0} step={k === "amount" ? "0.01" : "1"} value={(f as any)[k]} onChange={n(k)} /></div>
        ))}
      </div>
      <Textarea rows={3} maxLength={20000} placeholder="Paste the comments here (one per line)" value={f.comments} onChange={(e) => setF({ ...f, comments: e.target.value })} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={f.complete} onCheckedChange={(c) => setF({ ...f, complete: c })} />Mark as completed</label>
        <Button size="sm" onClick={submit} disabled={busy}>{busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Save progress</Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Money still held: {usd(order.escrow_balance)}</p>
    </div>
  );
}

export default function AdminRoastBoost() {
  const [pricing, setPricing] = useState<RoastBoostPricing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: p }, { data: o }, { data: ps }] = await Promise.all([
      db.from("roast_boost_pricing").select("*").order("subtype"),
      db.from("roast_boost_orders").select("*").order("created_at", { ascending: false }),
      db.from("roast_boost_posts").select("*").order("created_at", { ascending: false }),
    ]);
    setPricing(p ?? []); setOrders(o ?? []); setPosts(ps ?? []);
    const ids = [...new Set((o ?? []).map((x: Order) => x.advertiser_id))] as string[];
    if (ids.length) {
      const { data: prof } = await supabase.from("profiles").select("id, email, company_name").in("id", ids);
      setEmails(Object.fromEntries((prof ?? []).map((x: any) => [x.id, x.company_name ? `${x.company_name} (${x.email})` : x.email])));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const review = async (id: string, approve: boolean) => {
    const { error } = await db.rpc("review_roast_boost", { _order_id: id, _approve: approve, _notes: notes[id] || null });
    if (error) return toast.error(friendlyError(error));
    toast.success(approve ? "Approved and started" : "Declined and refunded");
    load();
  };
  const copyAndSend = async (p: Post) => {
    await navigator.clipboard.writeText(p.post_url).catch(() => {});
    const { error } = await db.rpc("mark_roast_boost_post_sent", { _post_id: p.id });
    if (error) return toast.error(friendlyError(error));
    toast.success("Link copied and marked as sent");
    load();
  };

  const newPosts = posts.filter((p) => p.status === "new");
  const pending = orders.filter((o) => o.status === "pending_approval");

  const OrderCard = ({ o }: { o: Order }) => {
    const ps = posts.filter((p) => p.order_id === o.id);
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-medium text-foreground">{emails[o.advertiser_id] ?? o.advertiser_id}</div>
            <div className="text-xs text-muted-foreground">{subtypeLabel(o.subtype)} · {PLATFORM_LABELS[o.platform] ?? o.platform} · {o.followers.toLocaleString()} followers · {o.days} days · {usd(o.total_cost)}</div>
            <a href={o.page_url} target="_blank" rel="noreferrer" className="text-xs text-primary break-all">{o.page_url}</a>
          </div>
          <Badge variant={o.status === "rejected" ? "destructive" : "secondary"}>{STATUS[o.status] ?? o.status}</Badge>
        </div>
        <AdvertiserOfferView mediaUrl={o.offer_media_url} mediaType={o.offer_media_type} text={o.offer_text} />
        <div className="text-xs text-muted-foreground">Followers delivered: {o.followers_delivered}/{o.followers} · Held: {usd(o.escrow_balance)}</div>
        {ps.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-foreground">Posts from advertiser</div>
            {ps.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                <a href={p.post_url} target="_blank" rel="noreferrer" className="text-primary break-all">{p.post_url}</a>
                {p.status === "new"
                  ? <Button size="sm" variant="secondary" className="h-7 shrink-0" onClick={() => copyAndSend(p)}><Copy className="mr-1 h-3 w-3" />Copy and mark sent</Button>
                  : <span className="shrink-0 text-muted-foreground">Sent</span>}
              </div>
            ))}
          </div>
        )}
        {o.status === "pending_approval" && (
          <div className="space-y-2">
            <Input placeholder="Note to advertiser (optional)" maxLength={500} value={notes[o.id] || ""} onChange={(e) => setNotes((s) => ({ ...s, [o.id]: e.target.value }))} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => review(o.id, true)}><Check className="mr-1 h-3.5 w-3.5" />Approve</Button>
              <Button size="sm" variant="destructive" onClick={() => review(o.id, false)}><X className="mr-1 h-3.5 w-3.5" />Decline and refund</Button>
            </div>
          </div>
        )}
        {o.status === "active" && <DeliveryForm order={o} posts={ps} onDone={load} />}
      </div>
    );
  };

  return (
    <AdminLayout>
      <MotionWrapper className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Roast and Boost</h1>
          <p className="text-sm text-muted-foreground">Set prices, approve requests, send new posts to followers and log progress.</p>
        </div>
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : (
          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">Requests {pending.length + newPosts.length > 0 && `(${pending.length + newPosts.length} need attention)`}</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
            </TabsList>
            <TabsContent value="orders" className="space-y-4 pt-4">
              {newPosts.length > 0 && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground">
                  {newPosts.length} new post link{newPosts.length > 1 ? "s" : ""} waiting to be sent to followers.
                </div>
              )}
              {orders.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
              {orders.map((o) => <OrderCard key={o.id} o={o} />)}
            </TabsContent>
            <TabsContent value="pricing" className="space-y-3 pt-4">
              {pricing.map((p) => <PricingRow key={p.subtype} p={p} onSaved={load} />)}
            </TabsContent>
          </Tabs>
        )}
      </MotionWrapper>
    </AdminLayout>
  );
}
