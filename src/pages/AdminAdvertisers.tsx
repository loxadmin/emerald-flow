import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";

interface Advertiser {
  id: string; email: string; full_name: string | null; company_name: string | null;
  website: string | null; created_at: string;
  category?: { name: string; status: string } | null;
  wallet?: { balance: number; is_activated: boolean } | null;
}
interface Category { id: string; name: string; }

const SUBTYPES = ["musician", "youtuber", "app", "website", "ecommerce", "service", "real_estate"];
const TYPES = ["engagement", "performance", "commerce"];

export default function AdminAdvertisers() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [advType, setAdvType] = useState("performance");
  const [advSubtype, setAdvSubtype] = useState("website");

  const fetchAll = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: cats } = await supabase.from("categories").select("id, name").eq("is_active", true).order("name");
    setCategories((cats as Category[]) || []);
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

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => {
    setEmail(""); setFullName(""); setCompanyName(""); setWebsite("");
    setCategoryId(""); setAdvType("performance"); setAdvSubtype("website");
  };

  const handleCreate = async () => {
    if (!email.trim() || !categoryId) { toast.error("Email and category are required"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-create-advertiser", {
      body: {
        email: email.trim().toLowerCase(),
        full_name: fullName.trim() || null,
        company_name: companyName.trim() || null,
        website: website.trim() || null,
        category_id: categoryId,
        advertiser_type: advType,
        advertiser_subtype: advSubtype,
      },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Something went wrong");
      return;
    }
    toast.success("Advertiser invited! Magic link sent.");
    setOpen(false);
    resetForm();
    fetchAll();
  };

  return (
    <AdminLayout>
      <MotionWrapper className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Advertisers</h1>
            <p className="text-sm text-muted-foreground">All registered advertisers and their status</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><UserPlus className="h-3.5 w-3.5" /> Add Advertiser</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Invite New Advertiser</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label className="text-xs">Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="advertiser@business.com" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Full Name</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Company</Label><Input value={companyName} onChange={e => setCompanyName(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Website (auto-verified)</Label><Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="business.com" /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Category *</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ad Type</Label>
                    <Select value={advType} onValueChange={setAdvType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Subtype</Label>
                    <Select value={advSubtype} onValueChange={setAdvSubtype}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SUBTYPES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">A magic-link invite will be sent. Website (if provided) is added pre-verified.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Sending...</> : "Send Invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
