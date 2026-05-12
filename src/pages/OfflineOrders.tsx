import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Loader2, ShoppingCart, Clock, CheckCircle2 } from "lucide-react";

type Order = {
  id: string;
  buyer_name: string;
  buyer_phone: string | null;
  buyer_email: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  accept_deadline: string;
  fulfill_deadline: string | null;
  created_at: string;
  offline_offers?: { product_name: string };
};

const STATUS_STYLES: Record<string, string> = {
  pending_acceptance: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  accepted: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  fulfilled_by_advertiser: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  confirmed_by_admin: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  expired: "bg-muted text-muted-foreground border-border",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

export default function OfflineOrders() {
  const { user, businessVerified } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("offline_orders" as any)
      .select("*, offline_offers(product_name)")
      .eq("advertiser_id", user.id)
      .order("created_at", { ascending: false });
    setOrders((data as any[]) || []);
    setLoading(false);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [user?.id]);

  const accept = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc("accept_offline_order" as any, { _order_id: id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Order accepted. You have 12 hours to fulfill.");
    load();
  };
  const fulfill = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc("fulfill_offline_order" as any, { _order_id: id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as fulfilled. Awaiting admin confirmation.");
    load();
  };

  if (businessVerified === false) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-md text-center py-20">
          <p className="text-sm text-muted-foreground mb-3">You must verify your business document first.</p>
          <Link to="/offline/verify"><Button size="sm">Go to verification</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <MotionWrapper>
          <p className="eyebrow mb-1">Offline</p>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pending purchase orders relayed by admin. Accept within 12 hours, then fulfill within 12 hours.</p>
        </MotionWrapper>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{o.offline_offers?.product_name || "Order"} · {o.buyer_name}</p>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[o.status] || ""}`}>{o.status.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Qty: {o.quantity} · Total: ${Number(o.total_amount).toFixed(2)} · Commission: ${Number(o.commission_amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">Buyer: {o.buyer_phone || "—"} · {o.buyer_email || "—"}</p>
                      {o.status === "pending_acceptance" && (
                        <p className="mt-1 text-[11px] text-amber-600 inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {timeLeft(o.accept_deadline)} to accept</p>
                      )}
                      {o.status === "accepted" && o.fulfill_deadline && (
                        <p className="mt-1 text-[11px] text-sky-600 inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {timeLeft(o.fulfill_deadline)} to fulfill</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {o.status === "pending_acceptance" && (
                        <Button size="sm" onClick={() => accept(o.id)} disabled={busy === o.id}>
                          {busy === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Accept (-$${Number(o.commission_amount).toFixed(2)})`}
                        </Button>
                      )}
                      {o.status === "accepted" && (
                        <Button size="sm" variant="outline" onClick={() => fulfill(o.id)} disabled={busy === o.id}>
                          {busy === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark fulfilled</>}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
