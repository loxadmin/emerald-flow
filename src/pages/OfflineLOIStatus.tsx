import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Download, Lock, Rocket, Target } from "lucide-react";

type LOI = any;

const steps = [
  { key: "generated", label: "Generated" },
  { key: "approved", label: "Signed by Karbali" },
  { key: "threshold_reached", label: "Threshold reached" },
  { key: "campaign_launched", label: "Campaign launched" },
];

function activeIndex(status: string): number {
  if (status === "campaign_launched") return 3;
  if (status === "threshold_reached") return 2;
  if (status === "approved") return 1;
  return 0;
}

export default function OfflineLOIStatus() {
  const [loi, setLoi] = useState<LOI | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    const { data } = await supabase
      .from("letters_of_intent" as any)
      .select("*")
      .eq("advertiser_id", u.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLoi(data);
    setLoading(false);
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const download = async () => {
    if (!loi?.pdf_path) return toast.error("PDF not available yet");
    const { data, error } = await supabase.storage
      .from("loi-documents")
      .createSignedUrl(loi.pdf_path, 300);
    if (error || !data) return toast.error("Unable to open PDF");
    window.open(data.signedUrl, "_blank");
  };

  if (loading) {
    return <DashboardLayout><p className="text-sm text-muted-foreground">Loading…</p></DashboardLayout>;
  }
  if (!loi) {
    return (
      <DashboardLayout>
        <div className="max-w-lg">
          <p className="text-sm text-muted-foreground">You have no Letter of Intent yet.</p>
          <Link to="/offline/loi"><Button className="mt-3">Reserve consumer demand</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  const idx = activeIndex(loi.status);
  const pct = Math.min(100, Math.round((loi.current_progress / Math.max(1, loi.customer_goal)) * 100));
  const isPending = loi.status === "pending_admin_approval";
  const canDownload = !isPending && loi.pdf_path;

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Agreement</p>
            <h1 className="text-2xl font-semibold tracking-tight">{loi.agreement_id}</h1>
            <p className="text-sm text-muted-foreground mt-1">{loi.company_name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={download} disabled={!canDownload}>
              {canDownload ? <><Download className="h-4 w-4 mr-1" /> Download LOI</> : <><Lock className="h-4 w-4 mr-1" /> LOI locked</>}
            </Button>
            {loi.status === "threshold_reached" && (
              <Link to="/offline/campaign">
                <Button><Rocket className="h-4 w-4 mr-1" /> Launch campaign</Button>
              </Link>
            )}
          </div>
        </div>

        {isPending && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200 p-4 mb-6 flex gap-3 items-start">
            <Clock className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Awaiting admin approval</p>
              <p className="text-xs mt-0.5 opacity-90">
                We're reviewing your reservation. You'll be able to download the signed LOI as soon as a Karbali admin approves it.
              </p>
            </div>
          </div>
        )}

        {loi.status === "rejected" && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 text-destructive p-4 mb-6">
            <p className="font-medium text-sm">Application rejected</p>
            {loi.admin_notes && <p className="text-xs mt-1">{loi.admin_notes}</p>}
            <Link to="/offline/loi"><Button size="sm" variant="outline" className="mt-3">Submit new LOI</Button></Link>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-5 mb-4">
          <h2 className="text-sm font-semibold mb-4">Status</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {steps.map((s, i) => {
              const done = i <= idx && loi.status !== "rejected";
              return (
                <li key={s.key} className={`rounded-md border p-3 ${done ? "border-primary/40 bg-primary/5" : "border-border bg-background"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="text-[10px]">{i + 1}</span>}
                    </div>
                    <p className="text-xs font-medium">{s.label}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Consumer demand progress</h2>
            <span className="text-xs text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="mb-2" />
          <p className="text-xs text-muted-foreground">
            <strong>{Number(loi.current_progress).toLocaleString()}</strong> of {Number(loi.customer_goal).toLocaleString()} users reached.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Detail label="Products" value={(loi.products || []).join(", ")} />
          <Detail label="Customer goal" value={`${Number(loi.customer_goal).toLocaleString()} users`} />
          <Detail label="Duration" value={loi.duration_days ? `${loi.duration_days} days` : loi.custom_duration_text || "Custom"} />
          <Detail label="Campaign goal" value={loi.campaign_goal === "Custom" ? loi.custom_goal_text : loi.campaign_goal} />
          <Detail label="Contact" value={`${loi.contact_person} (${loi.job_title})`} />
          <Detail label="Business email" value={loi.business_email} />
          <Detail label="Country" value={loi.country} />
        </div>
      </div>
    </DashboardLayout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5">{value || "—"}</p>
    </div>
  );
}
