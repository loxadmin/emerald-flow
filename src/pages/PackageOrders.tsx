import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";
import { Loader2, Package as PackageIcon, ArrowLeft } from "lucide-react";

type Order = {
  id: string; package_name: string; unit_label: string;
  units: number; unit_price_usd: number; total_amount_usd: number; duration_days: number;
  app_links: string[]; payment_method: string; status: string;
  admin_notes: string | null; created_at: string; starts_at: string | null; ends_at: string | null;
  platform: string | null; target_milestone_id: string | null; milestone_breakdown: any;
};
type Milestone = { id: string; name: string };


const STATUS: Record<string, string> = {
  pending_payment: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  pending_review: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  completed: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-muted text-muted-foreground border-border",
};

export default function PackageOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data }, { data: ms }] = await Promise.all([
        supabase.from("package_orders" as any)
          .select("*").eq("advertiser_id", user.id).order("created_at", { ascending: false }),
        supabase.from("milestones" as any).select("id,name"),
      ]);
      setOrders((data as any) || []);
      setMilestones((ms as any) || []);
      setLoading(false);
    })();
  }, [user?.id]);


  return (
    <DashboardLayout>
      <MotionWrapper>
        <div className="mb-6 flex items-center gap-3">
          <Link to="/packages"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Packages</Button></Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My package orders</h1>
            <p className="text-sm text-muted-foreground">Track the status of every package you've purchased.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
            <PackageIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
            No orders yet. Browse packages to get started.
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{o.package_name}</p>
                      <Badge variant="outline" className={STATUS[o.status] || ""}>{o.status.replace(/_/g, " ")}</Badge>
                      <Badge variant="secondary">{o.payment_method}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {o.units.toLocaleString()} {o.unit_label} · ${o.total_amount_usd} · {o.duration_days} days
                    </p>
                    {o.starts_at && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Running: {new Date(o.starts_at).toLocaleDateString()} → {o.ends_at ? new Date(o.ends_at).toLocaleDateString() : "—"}
                      </p>
                    )}
                    {o.app_links?.length > 0 && (
                      <ul className="mt-2 text-xs space-y-0.5">
                        {o.app_links.map((l, i) => (
                          <li key={i} className="truncate"><a className="text-primary underline" href={l} target="_blank" rel="noreferrer">{l}</a></li>
                        ))}
                      </ul>
                    )}
                    {o.admin_notes && <p className="mt-2 text-xs text-muted-foreground">Admin notes: {o.admin_notes}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </MotionWrapper>
    </DashboardLayout>
  );
}
