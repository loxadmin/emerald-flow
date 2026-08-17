import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Rocket, TrendingUp } from "lucide-react";
import { friendlyError } from "@/lib/errors";

type Opp = {
  id: string;
  current_brand: string;
  target_brand: string;
  eligible_users: number;
  completion_rate: number;
  estimated_duration_days: number;
  estimated_cost_usd: number;
  category: string | null;
};

export default function OfflineCampaignLaunch() {
  const navigate = useNavigate();
  const [loi, setLoi] = useState<any>(null);
  const [opps, setOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const [loiRes, oppsRes] = await Promise.all([
        supabase
          .from("letters_of_intent" as any)
          .select("*")
          .eq("advertiser_id", u.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("migration_opportunities" as any)
          .select("*")
          .eq("is_active", true)
          .order("eligible_users", { ascending: false }),
      ]);
      setLoi(loiRes.data);
      setOpps((oppsRes.data as any) || []);
      setLoading(false);
    })();
  }, []);

  const toggle = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelected(n);
  };

  const launch = async () => {
    if (selected.size === 0) return toast.error("Select at least one migration opportunity");
    // For v1, mark LOI as campaign_launched and hand off. Actual campaign creation
    // can be layered on top later.
    const { error } = await supabase
      .from("letters_of_intent" as any)
      .update({ status: "campaign_launched", campaign_launched_at: new Date().toISOString() })
      .eq("id", loi.id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Campaign launched from your reserved audience");
    navigate("/offline/loi/status");
  };

  if (loading) {
    return <DashboardLayout><p className="text-sm text-muted-foreground">Loading…</p></DashboardLayout>;
  }
  if (!loi || (loi.status !== "threshold_reached" && loi.status !== "campaign_launched")) {
    return (
      <DashboardLayout>
        <div className="max-w-lg text-sm">
          <p className="text-muted-foreground">
            Your consumer demand threshold hasn't been reached yet. You can launch your campaign once Karbali notifies you.
          </p>
          <Link to="/offline/loi/status"><Button className="mt-3" variant="outline">View status</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider text-primary flex items-center gap-1">
            <Rocket className="h-3.5 w-3.5" /> Threshold reached
          </p>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">Launch your campaign</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Karbali reached your reserved audience. Instead of guessing, pick from real migration opportunities we've already identified in our user base.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {opps.map((o) => {
            const active = selected.has(o.id);
            return (
              <button
                key={o.id}
                onClick={() => toggle(o.id)}
                className={`text-left rounded-lg border p-4 transition ${active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/40"}`}
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{o.current_brand}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium text-primary">{o.target_brand}</span>
                </div>
                <p className="text-lg font-semibold mt-2">{o.eligible_users.toLocaleString()} users</p>
                <p className="text-xs text-muted-foreground">willing to switch</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <div>
                    <p className="uppercase tracking-wider">Completion</p>
                    <p className="text-foreground font-medium mt-0.5 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> {o.completion_rate}%
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wider">Duration</p>
                    <p className="text-foreground font-medium mt-0.5">{o.estimated_duration_days}d</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wider">Est. cost</p>
                    <p className="text-foreground font-medium mt-0.5">${Number(o.estimated_cost_usd).toFixed(0)}</p>
                  </div>
                </div>
              </button>
            );
          })}
          {opps.length === 0 && (
            <div className="col-span-2 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              No migration opportunities available yet. Karbali admin will publish them shortly.
            </div>
          )}
        </div>

        <Button onClick={launch} disabled={selected.size === 0}>
          <Rocket className="h-4 w-4 mr-1" /> Launch campaign with {selected.size} selection{selected.size === 1 ? "" : "s"}
        </Button>
      </div>
    </DashboardLayout>
  );
}
