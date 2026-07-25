import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Download, CheckCircle2, XCircle, Target, TrendingUp } from "lucide-react";

type LOI = {
  id: string;
  advertiser_id: string;
  agreement_id: string;
  company_name: string;
  website: string;
  business_email: string;
  contact_person: string;
  job_title: string;
  country: string;
  products: string[];
  customer_goal: number;
  duration_days: number | null;
  custom_duration_text: string | null;
  campaign_goal: string;
  custom_goal_text: string | null;
  status: string;
  current_progress: number;
  pdf_path: string | null;
  admin_notes: string | null;
  created_at: string;
  generated_at: string | null;
  approved_at: string | null;
  threshold_reached_at: string | null;
};

export default function AdminLettersOfIntent() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LOI[]>([]);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressLoi, setProgressLoi] = useState<LOI | null>(null);
  const [progressVal, setProgressVal] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("letters_of_intent" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const metrics = useMemo(() => {
    const pending = rows.filter((r) => r.status === "pending_admin_approval").length;
    const completed = rows.filter((r) => r.status === "threshold_reached" || r.status === "campaign_launched").length;
    const reserved = rows.reduce((s, r) => s + (r.customer_goal || 0), 0);
    const reached = rows.filter((r) => r.status === "threshold_reached" || r.status === "campaign_launched").length;
    return { total: rows.length, pending, completed, reserved, reached };
  }, [rows]);

  const approve = async (loi: LOI) => {
    try {
      const { data: gen, error: genErr } = await supabase.functions.invoke("generate-loi-pdf", {
        body: { loi_id: loi.id },
      });
      if (genErr) throw genErr;
      const pdfPath = (gen as any).path;
      const { error } = await supabase.rpc("approve_letter_of_intent" as any, {
        _loi_id: loi.id,
        _pdf_path: pdfPath,
      });
      if (error) throw error;
      supabase.functions.invoke("notify", { body: { event: "loi_approved", payload: { loi_id: loi.id } } }).catch(() => {});
      toast.success("LOI approved and PDF generated");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve");
    }
  };

  const reject = async (loi: LOI) => {
    const notes = prompt("Reason for rejection?") || "";
    const { error } = await supabase.rpc("reject_letter_of_intent" as any, {
      _loi_id: loi.id,
      _notes: notes,
    });
    if (error) return toast.error(error.message);
    toast.success("LOI rejected");
    load();
  };

  const markReached = async (loi: LOI) => {
    if (!confirm(`Mark threshold reached for ${loi.company_name}? Advertiser will be notified.`)) return;
    const { error } = await supabase.rpc("mark_loi_threshold_reached" as any, { _loi_id: loi.id });
    if (error) return toast.error(error.message);
    supabase.functions.invoke("notify", { body: { event: "loi_threshold_reached", payload: { loi_id: loi.id } } }).catch(() => {});
    toast.success("Threshold reached — advertiser notified");
    load();
  };

  const openProgress = (loi: LOI) => {
    setProgressLoi(loi);
    setProgressVal(String(loi.current_progress));
    setProgressOpen(true);
  };
  const saveProgress = async () => {
    if (!progressLoi) return;
    const n = Number(progressVal);
    if (!Number.isFinite(n) || n < 0) return toast.error("Invalid number");
    const { error } = await supabase.rpc("update_loi_progress" as any, {
      _loi_id: progressLoi.id,
      _current: Math.floor(n),
    });
    if (error) return toast.error(error.message);
    toast.success("Progress updated");
    setProgressOpen(false);
    load();
  };

  const downloadPdf = async (loi: LOI) => {
    if (!loi.pdf_path) return toast.error("No PDF yet");
    const { data, error } = await supabase.storage
      .from("loi-documents")
      .createSignedUrl(loi.pdf_path, 300);
    if (error || !data) return toast.error("Failed to open PDF");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl">
        <h1 className="text-xl font-semibold mb-1">Letters of Intent</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Review offline advertiser reservations, approve them to auto-generate signed LOIs, and mark thresholds when Karbali reaches the requested customer base.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <MetricCard label="Total LOIs" value={metrics.total} />
          <MetricCard label="Pending" value={metrics.pending} accent="text-amber-500" />
          <MetricCard label="Completed" value={metrics.completed} accent="text-primary" />
          <MetricCard label="Reserved demand" value={metrics.reserved.toLocaleString() + " users"} />
          <MetricCard label="Thresholds reached" value={metrics.reached} accent="text-primary" />
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No Letters of Intent yet.</p>
        )}

        <div className="space-y-3">
          {rows.map((r) => {
            const pct = Math.min(100, Math.round((r.current_progress / Math.max(1, r.customer_goal)) * 100));
            return (
              <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{r.company_name}</p>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">{r.status.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted-foreground">{r.agreement_id}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.contact_person} · {r.job_title} · {r.business_email}
                    </p>
                    <p className="text-xs">
                      Products: <span className="text-muted-foreground">{(r.products || []).join(", ")}</span>
                    </p>
                    <p className="text-xs">
                      Goal: <strong>{Number(r.customer_goal).toLocaleString()}</strong> users ·{" "}
                      Duration: {r.duration_days ? `${r.duration_days} days` : r.custom_duration_text || "Custom"} ·{" "}
                      {r.campaign_goal === "Custom" ? r.custom_goal_text : r.campaign_goal}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.status === "pending_admin_approval" && (
                      <>
                        <Button size="sm" onClick={() => approve(r)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve & generate
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => reject(r)}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {r.pdf_path && (
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(r)}>
                        <Download className="h-3.5 w-3.5 mr-1" /> PDF
                      </Button>
                    )}
                    {r.status === "approved" && (
                      <Button size="sm" onClick={() => markReached(r)}>
                        <Target className="h-3.5 w-3.5 mr-1" /> Mark threshold reached
                      </Button>
                    )}
                    {(r.status === "approved" || r.status === "threshold_reached") && (
                      <Button size="sm" variant="outline" onClick={() => openProgress(r)}>
                        <TrendingUp className="h-3.5 w-3.5 mr-1" /> Update progress
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>
                      {r.current_progress.toLocaleString()} / {r.customer_goal.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
                {r.admin_notes && (
                  <p className="mt-2 text-xs text-muted-foreground">Admin notes: {r.admin_notes}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={progressOpen} onOpenChange={setProgressOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update reservation progress</DialogTitle>
          </DialogHeader>
          <Input
            type="number"
            value={progressVal}
            onChange={(e) => setProgressVal(e.target.value)}
            placeholder="Current users acquired"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressOpen(false)}>Cancel</Button>
            <Button onClick={saveProgress}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${accent || ""}`}>{value}</p>
    </div>
  );
}
