import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Verification = { id: string; advertiser_id: string; document_url: string; document_type: string; status: string; admin_notes: string | null; created_at: string };
type Offer = { id: string; advertiser_id: string; product_name: string; description: string | null; moq_value: number; moq_unit: string; state: string; business_address: string; business_phone: string; business_email: string; status: string; admin_notes: string | null; created_at: string };
type Order = { id: string; offer_id: string; advertiser_id: string; buyer_name: string; buyer_phone: string | null; buyer_email: string | null; quantity: number; unit_price: number; total_amount: number; commission_amount: number; status: string; created_at: string; accepted_at: string | null; fulfilled_at: string | null };

export default function AdminOffline() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState(0.005);
  const [minWalletBalance, setMinWalletBalance] = useState(300);

  // Create-order dialog
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderOffer, setOrderOffer] = useState<Offer | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const load = async () => {
    setLoading(true);
    const [v, o, ord, settings] = await Promise.all([
      supabase.from("business_verifications" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("offline_offers" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("offline_orders" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("admin_settings").select("key,value").in("key", ["offline_commission_rate", "offline_min_wallet_balance"]),
    ]);
    setVerifications((v.data as any) || []);
    setOffers((o.data as any) || []);
    setOrders((ord.data as any) || []);
    (settings.data || []).forEach((row) => {
      if (row.key === "offline_commission_rate") setCommissionRate(Number(row.value));
      if (row.key === "offline_min_wallet_balance") setMinWalletBalance(Number(row.value));
    });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const reviewVerification = async (id: string, approve: boolean) => {
    const notes = approve ? null : prompt("Reason for rejection?") || "Rejected";
    const { error } = await supabase
      .from("business_verifications" as any)
      .update({ status: approve ? "approved" : "rejected", admin_notes: notes, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved" : "Rejected");
    load();
  };

  const reviewOffer = async (id: string, approve: boolean) => {
    const notes = approve ? "" : prompt("Reason for rejection?") || "Rejected";
    const { error } = await supabase.rpc("review_offline_offer" as any, { _offer_id: id, _approve: approve, _notes: notes });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Offer approved" : "Offer rejected");
    load();
  };

  const openCreateOrder = (offer: Offer) => {
    setOrderOffer(offer);
    setBuyerName(""); setBuyerPhone(""); setBuyerEmail("");
    setQuantity(String(offer.moq_value));
    setUnitPrice("");
    setOrderOpen(true);
  };

  const submitOrder = async () => {
    if (!orderOffer) return;
    const qty = Number(quantity);
    const price = Number(unitPrice);
    if (!buyerName || !qty || !price) return toast.error("Fill required fields");
    if (qty < Number(orderOffer.moq_value)) return toast.error(`Quantity must meet the MOQ of ${orderOffer.moq_value} ${orderOffer.moq_unit}`);
    const total = qty * price;
    const commission = +(total * commissionRate).toFixed(2);
    const { error } = await supabase.from("offline_orders" as any).insert({
      offer_id: orderOffer.id,
      advertiser_id: orderOffer.advertiser_id,
      buyer_name: buyerName,
      buyer_phone: buyerPhone || null,
      buyer_email: buyerEmail || null,
      quantity: qty,
      unit_price: price,
      total_amount: total,
      commission_rate: commissionRate,
      commission_amount: commission,
    });
    if (error) return toast.error(error.message);
    toast.success("Order relayed to advertiser");
    setOrderOpen(false);
    load();
  };

  const confirmFulfillment = async (id: string) => {
    const notes = prompt("Confirmation notes (optional)") || "";
    const { error } = await supabase.rpc("confirm_offline_order" as any, { _order_id: id, _notes: notes });
    if (error) return toast.error(error.message);
    toast.success("Order confirmed");
    load();
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl">
        <h1 className="text-xl font-semibold mb-1">Offline Ads</h1>
        <p className="text-sm text-muted-foreground mb-6">Manage business verifications, offline offers, and relay sales orders. Commission is {(commissionRate * 100).toFixed(2)}%; advertisers need ${minWalletBalance} minimum wallet balance to accept orders.</p>

        <Tabs defaultValue="verifications">
          <TabsList>
            <TabsTrigger value="verifications">Verifications ({verifications.filter(v=>v.status==='pending').length})</TabsTrigger>
            <TabsTrigger value="offers">Offers ({offers.filter(o=>o.status==='pending').length})</TabsTrigger>
            <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="verifications" className="mt-4 space-y-3">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {verifications.map(v => (
              <div key={v.id} className="rounded-lg border border-border p-4 bg-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-sm">
                    <p className="font-medium">{v.document_type.toUpperCase()} · <span className="text-muted-foreground">{v.status}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Advertiser: {v.advertiser_id}</p>
                    <a href={v.document_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Open document</a>
                  </div>
                  {v.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => reviewVerification(v.id, true)}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => reviewVerification(v.id, false)}>Reject</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!loading && verifications.length === 0 && <p className="text-sm text-muted-foreground">No verifications yet.</p>}
          </TabsContent>

          <TabsContent value="offers" className="mt-4 space-y-3">
            {offers.map(o => (
              <div key={o.id} className="rounded-lg border border-border p-4 bg-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{o.product_name} · <span className="text-muted-foreground">{o.status}</span></p>
                    <p className="text-xs text-muted-foreground">MOQ: {o.moq_value} {o.moq_unit} · {o.state}</p>
                    <p className="text-xs text-muted-foreground">{o.business_address}</p>
                    <p className="text-xs text-muted-foreground">{o.business_phone} · {o.business_email}</p>
                    {o.description && <p className="text-xs mt-1">{o.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    {o.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => reviewOffer(o.id, true)}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => reviewOffer(o.id, false)}>Reject</Button>
                      </>
                    )}
                    {o.status === "approved" && (
                      <Button size="sm" onClick={() => openCreateOrder(o)}>Relay order</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!loading && offers.length === 0 && <p className="text-sm text-muted-foreground">No offers yet.</p>}
          </TabsContent>

          <TabsContent value="orders" className="mt-4 space-y-3">
            {orders.map(ord => (
              <div key={ord.id} className="rounded-lg border border-border p-4 bg-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{ord.buyer_name} · <span className="text-muted-foreground">{ord.status}</span></p>
                    <p className="text-xs text-muted-foreground">Qty {ord.quantity} @ ${ord.unit_price} = ${ord.total_amount} · Commission ${ord.commission_amount}</p>
                    <p className="text-xs text-muted-foreground">{ord.buyer_phone} · {ord.buyer_email}</p>
                  </div>
                  {ord.status === "fulfilled_by_advertiser" && (
                    <Button size="sm" onClick={() => confirmFulfillment(ord.id)}>Confirm fulfillment</Button>
                  )}
                </div>
              </div>
            ))}
            {!loading && orders.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relay order to advertiser</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Buyer name *" value={buyerName} onChange={e=>setBuyerName(e.target.value)} />
            <Input placeholder="Buyer phone" value={buyerPhone} onChange={e=>setBuyerPhone(e.target.value)} />
            <Input placeholder="Buyer email" value={buyerEmail} onChange={e=>setBuyerEmail(e.target.value)} />
            <Input type="number" placeholder={`Quantity (min ${orderOffer?.moq_value} ${orderOffer?.moq_unit})`} value={quantity} onChange={e=>setQuantity(e.target.value)} />
            <Input type="number" placeholder="Unit price (USD) *" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)} />
            {quantity && unitPrice && (
              <p className="text-xs text-muted-foreground">
                Total ${(Number(quantity)*Number(unitPrice)).toFixed(2)} · Commission ${(Number(quantity)*Number(unitPrice)*commissionRate).toFixed(2)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOrderOpen(false)}>Cancel</Button>
            <Button onClick={submitOrder}>Relay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
