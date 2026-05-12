import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Plus, Loader2, Package } from "lucide-react";
import { NIGERIA_STATES } from "@/lib/nigeria-states";

type Offer = {
  id: string;
  product_name: string;
  description: string | null;
  moq_value: number;
  moq_unit: "liter" | "kg" | "piece";
  state: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  submission_fee: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function OfflineOffers() {
  const { user, businessVerified, walletActivated } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionFee, setSubmissionFee] = useState(100);
  const [form, setForm] = useState({
    product_name: "",
    description: "",
    moq_value: "",
    moq_unit: "piece" as "piece" | "kg" | "liter",
    state: "",
    business_address: "",
    business_phone: "",
    business_email: "",
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data }, { data: feeRow }] = await Promise.all([
      supabase.from("offline_offers" as any).select("*").eq("advertiser_id", user.id).order("created_at", { ascending: false }),
      supabase.from("admin_settings").select("value").eq("key", "offline_offer_submission_fee").maybeSingle(),
    ]);
    setOffers((data as any[]) || []);
    if (feeRow?.value) setSubmissionFee(Number(feeRow.value));
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [user?.id]);

  const handleCreate = async () => {
    if (!user) return;
    if (!form.product_name || !form.moq_value || !form.state || !form.business_address || !form.business_phone || !form.business_email) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const { data: inserted, error } = await supabase
        .from("offline_offers" as any)
        .insert({
          advertiser_id: user.id,
          product_name: form.product_name.trim(),
          description: form.description.trim() || null,
          moq_value: Number(form.moq_value),
          moq_unit: form.moq_unit,
          state: form.state,
          business_address: form.business_address.trim(),
          business_phone: form.business_phone.trim(),
          business_email: form.business_email.trim(),
          submission_fee: submissionFee,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: rpcErr } = await supabase.rpc("submit_offline_offer" as any, { _offer_id: (inserted as any).id });
      if (rpcErr) {
        // Roll back the offer if escrow failed
        await supabase.from("offline_offers" as any).delete().eq("id", (inserted as any).id);
        throw rpcErr;
      }

      toast.success(`Offer submitted. $${submissionFee} placed in escrow pending admin review.`);
      setOpen(false);
      setForm({ product_name: "", description: "", moq_value: "", moq_unit: "piece", state: "", business_address: "", business_phone: "", business_email: "" });
      await load();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit offer");
    } finally {
      setSubmitting(false);
    }
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
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow mb-1">Offline</p>
              <h1 className="text-2xl font-semibold tracking-tight">My Offers</h1>
              <p className="mt-1 text-sm text-muted-foreground">Submit offers for admin approval. Submission fee: <span className="font-medium text-foreground">${submissionFee}</span> (escrow, refunded if rejected).</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!walletActivated}><Plus className="mr-1.5 h-4 w-4" /> New offer</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create an offline offer</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">Product / What you sell *</label>
                    <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} maxLength={200} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Description</label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} maxLength={1000} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">MOQ *</label>
                      <Input type="number" min="0" step="0.01" value={form.moq_value} onChange={(e) => setForm({ ...form, moq_value: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Unit *</label>
                      <select value={form.moq_unit} onChange={(e) => setForm({ ...form, moq_unit: e.target.value as any })} className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm">
                        <option value="piece">Pieces</option>
                        <option value="kg">Kilograms (kg)</option>
                        <option value="liter">Liters</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">State *</label>
                    <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm">
                      <option value="">Select state</option>
                      {NIGERIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Business address *</label>
                    <Textarea value={form.business_address} onChange={(e) => setForm({ ...form, business_address: e.target.value })} rows={2} maxLength={500} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">Phone *</label>
                      <Input value={form.business_phone} onChange={(e) => setForm({ ...form, business_phone: e.target.value })} maxLength={50} />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Email *</label>
                      <Input type="email" value={form.business_email} onChange={(e) => setForm({ ...form, business_email: e.target.value })} maxLength={255} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                  <Button size="sm" onClick={handleCreate} disabled={submitting}>
                    {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : `Submit & escrow $${submissionFee}`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </MotionWrapper>

        {!walletActivated && (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            Activate your wallet to start creating offers. <Link to="/wallet" className="underline">Go to wallet</Link>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : offers.length === 0 ? (
            <div className="text-center py-16">
              <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No offers yet. Create your first offer to get started.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {offers.map((o) => (
                <li key={o.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{o.product_name}</p>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[o.status] || ""}`}>{o.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        MOQ: {o.moq_value} {o.moq_unit} · {o.state} · {o.business_phone}
                      </p>
                      {o.admin_notes && <p className="mt-1 text-xs text-muted-foreground italic">Admin: {o.admin_notes}</p>}
                    </div>
                    <p className="text-[11px] text-muted-foreground tabular-nums">{new Date(o.created_at).toLocaleDateString()}</p>
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
