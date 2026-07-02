import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Package as PackageIcon, Loader2, ShoppingCart, Wallet, CreditCard, ClipboardList } from "lucide-react";

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  category_group_id: string | null;
  category_id: string | null;
  unit_label: string;
  unit_price_usd: number;
  min_units: number;
  max_units: number;
  duration_days: number;
  max_links: number;
  discount_pct: number | null;
};

type WalletInfo = { balance: number; is_activated: boolean };

const PENDING_KEY = "karbali_pending_package_purchase";

export default function Packages() {
  const { user, walletActivated } = useAuth();
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pkg | null>(null);
  const [units, setUnits] = useState<number>(500);
  const [links, setLinks] = useState<string[]>([""]);
  const [payMethod, setPayMethod] = useState<"wallet" | "paystack">("wallet");
  const [buying, setBuying] = useState(false);
  const [advertiserGroupId, setAdvertiserGroupId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: pkgs }, { data: w }, { data: cat }] = await Promise.all([
      supabase.from("ad_packages" as any).select("*").eq("is_active", true).order("sort_order").order("created_at"),
      supabase.from("wallets").select("balance, is_activated").eq("advertiser_id", user.id).maybeSingle(),
      supabase.from("advertiser_categories").select("category_id").eq("advertiser_id", user.id).maybeSingle(),
    ]);
    setPackages((pkgs as any) || []);
    setWallet((w as any) || null);
    if ((cat as any)?.category_id) {
      const { data: catRow } = await supabase.from("categories").select("group_id").eq("id", (cat as any).category_id).maybeSingle();
      setAdvertiserGroupId((catRow as any)?.group_id || null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  // Resume pending purchase after Paystack redirect
  useEffect(() => {
    if (searchParams.get("funded") === "package" && user) {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      sessionStorage.removeItem(PENDING_KEY);
      (async () => {
        // small delay so webhook has time to credit wallet
        await new Promise((r) => setTimeout(r, 1500));
        const { error } = await supabase.rpc("purchase_package_with_wallet" as any, {
          _package_id: p.package_id, _units: p.units, _links: p.links,
        });
        if (error) toast.error(`Payment received but purchase failed: ${error.message}. Balance updated — try again.`);
        else toast.success("Package purchased! Pending admin review.");
        load();
      })();
    }
    // eslint-disable-next-line
  }, [searchParams, user?.id]);

  const visible = useMemo(() => {
    if (showAll || !advertiserGroupId) return packages;
    return packages.filter((p) => !p.category_group_id || p.category_group_id === advertiserGroupId);
  }, [packages, advertiserGroupId, showAll]);

  const openBuy = (p: Pkg) => {
    setSelected(p);
    setUnits(p.min_units);
    setLinks([""]);
    setPayMethod("wallet");
  };

  const total = selected ? Number((units * selected.unit_price_usd).toFixed(2)) : 0;

  const submit = async () => {
    if (!selected || !user) return;
    const cleanLinks = links.map((l) => l.trim()).filter(Boolean);
    if (cleanLinks.length === 0) return toast.error("Add at least one app link");
    if (cleanLinks.length > selected.max_links) return toast.error(`Max ${selected.max_links} links`);
    for (const l of cleanLinks) {
      try { new URL(l); } catch { return toast.error(`Invalid URL: ${l}`); }
    }
    if (units < selected.min_units || units > selected.max_units) {
      return toast.error(`Units must be between ${selected.min_units} and ${selected.max_units}`);
    }

    setBuying(true);

    if (payMethod === "wallet") {
      if (!wallet?.is_activated) { setBuying(false); return toast.error("Activate your wallet first"); }
      if ((wallet?.balance || 0) < total) { setBuying(false); return toast.error("Insufficient wallet balance"); }
      const { error } = await supabase.rpc("purchase_package_with_wallet" as any, {
        _package_id: selected.id, _units: units, _links: cleanLinks,
      });
      setBuying(false);
      if (error) return toast.error(error.message);
      toast.success("Package purchased! Pending admin review.");
      setSelected(null); load();
      return;
    }

    // Paystack — top up wallet by exact amount, then complete purchase on redirect
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({
      package_id: selected.id, units, links: cleanLinks,
    }));
    const origin = window.location.origin;
    const { data, error } = await supabase.functions.invoke("paystack-wallet", {
      body: {
        action: "initialize_funding",
        amount: total,
        callback_origin: `${origin}`,
      },
    });
    setBuying(false);
    if (error || (data as any)?.error) {
      sessionStorage.removeItem(PENDING_KEY);
      return toast.error((data as any)?.error || error?.message || "Payment failed");
    }
    const url = (data as any)?.authorization_url;
    if (!url) { sessionStorage.removeItem(PENDING_KEY); return toast.error("No payment URL"); }
    // Store return path — Wallet page will bounce us back here after payment
    sessionStorage.setItem("karbali_return_to", `/packages?funded=package`);
    window.location.href = url;
  };





  return (
    <DashboardLayout>
      <MotionWrapper>
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ad Packages</h1>
            <p className="text-sm text-muted-foreground">Pre-priced templates — pick, pay, and go live after admin review.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/packages/orders">
              <Button variant="outline" size="sm"><ClipboardList className="mr-2 h-4 w-4" /> My orders</Button>
            </Link>
            {advertiserGroupId && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
                {showAll ? "Show relevant" : "Show all"}
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : visible.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
            <PackageIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
            No packages available right now.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((p) => (
              <div key={p.id} className="rounded-xl border bg-card p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{p.name}</h3>
                  {p.discount_pct ? <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 border">-{p.discount_pct}%</Badge> : null}
                </div>
                {p.description && <p className="mt-1.5 text-sm text-muted-foreground line-clamp-3">{p.description}</p>}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-muted-foreground">Price</p>
                    <p className="font-medium text-sm">${p.unit_price_usd}<span className="text-muted-foreground">/{p.unit_label}</span></p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium text-sm">{p.duration_days} days</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2 col-span-2">
                    <p className="text-muted-foreground">Range</p>
                    <p className="font-medium text-sm">{p.min_units.toLocaleString()} – {p.max_units.toLocaleString()} {p.unit_label}s</p>
                  </div>
                </div>
                <Button className="mt-4" onClick={() => openBuy(p)}>
                  <ShoppingCart className="mr-2 h-4 w-4" /> Buy package
                </Button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
          <DialogContent className="max-w-md">
            {selected && (
              <>
                <DialogHeader><DialogTitle>{selected.name}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>How many {selected.unit_label}s?</Label>
                    <Input
                      type="number"
                      min={selected.min_units}
                      max={selected.max_units}
                      value={units}
                      onChange={(e) => setUnits(Math.max(selected.min_units, Math.min(selected.max_units, Number(e.target.value) || 0)))}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Min {selected.min_units.toLocaleString()} · Max {selected.max_units.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <Label>App / website links (up to {selected.max_links})</Label>
                    <div className="space-y-2">
                      {links.map((l, i) => (
                        <div key={i} className="flex gap-2">
                          <Input value={l} onChange={(e) => setLinks(links.map((x, j) => j === i ? e.target.value : x))} placeholder="https://..." />
                          {links.length > 1 && (
                            <Button variant="outline" size="icon" onClick={() => setLinks(links.filter((_, j) => j !== i))}>✕</Button>
                          )}
                        </div>
                      ))}
                      {links.length < selected.max_links && (
                        <Button variant="ghost" size="sm" onClick={() => setLinks([...links, ""])}>+ Add another link</Button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-lg font-semibold">${total.toFixed(2)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayMethod("wallet")}
                      className={`rounded-lg border p-3 text-left text-sm transition ${payMethod === "wallet" ? "border-primary bg-primary/5" : "hover:bg-accent"}`}
                    >
                      <Wallet className="h-4 w-4 mb-1" />
                      <p className="font-medium">Wallet</p>
                      <p className="text-xs text-muted-foreground">Balance: ${(wallet?.balance || 0).toFixed(2)}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod("paystack")}
                      className={`rounded-lg border p-3 text-left text-sm transition ${payMethod === "paystack" ? "border-primary bg-primary/5" : "hover:bg-accent"}`}
                    >
                      <CreditCard className="h-4 w-4 mb-1" />
                      <p className="font-medium">Paystack</p>
                      <p className="text-xs text-muted-foreground">Card / bank</p>
                    </button>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                  <Button onClick={submit} disabled={buying}>
                    {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay $${total.toFixed(2)}`}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </MotionWrapper>
    </DashboardLayout>
  );
}
