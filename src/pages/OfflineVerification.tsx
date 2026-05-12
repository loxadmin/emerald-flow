import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Upload, FileCheck, Loader2, AlertCircle, CheckCircle2, Clock, XCircle, Wallet as WalletIcon, ArrowRight } from "lucide-react";

type Verification = {
  id: string;
  document_url: string;
  document_type: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export default function OfflineVerification() {
  const { user, walletActivated, refreshAccessState } = useAuth();
  const navigate = useNavigate();
  const [latest, setLatest] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("cac");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("business_verifications" as any)
      .select("*")
      .eq("advertiser_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatest(data as any);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [user?.id]);

  const handleUpload = async () => {
    if (!user || !file) {
      toast.error("Please select a document file");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("business-documents").upload(path, file);
      if (upErr) throw upErr;

      // If a previous rejected record exists, update it; otherwise insert new
      if (latest && latest.status === "rejected") {
        const { error } = await supabase
          .from("business_verifications" as any)
          .update({ document_url: path, document_type: docType, status: "pending", admin_notes: notes || null, updated_at: new Date().toISOString() })
          .eq("id", latest.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_verifications" as any)
          .insert({ advertiser_id: user.id, document_url: path, document_type: docType });
        if (error) throw error;
      }

      toast.success("Document submitted! Admin review in progress.");
      setFile(null);
      setNotes("");
      await load();
      await refreshAccessState();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const status = latest?.status;
  const StatusIcon = status === "approved" ? CheckCircle2 : status === "rejected" ? XCircle : Clock;
  const statusColor =
    status === "approved" ? "text-emerald-600" : status === "rejected" ? "text-destructive" : "text-amber-600";
  const statusBg =
    status === "approved" ? "bg-emerald-500/10 border-emerald-500/20" : status === "rejected" ? "bg-destructive/10 border-destructive/20" : "bg-amber-500/10 border-amber-500/20";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <MotionWrapper>
          <p className="eyebrow mb-1">Offline Onboarding · Step 1</p>
          <h1 className="text-2xl font-semibold tracking-tight">Business Document Verification</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your CAC certificate or business license. Our team will verify within 1–2 business days.
          </p>
        </MotionWrapper>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <>
            {latest && (
              <div className={`rounded-xl border p-4 ${statusBg}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon className={`h-5 w-5 mt-0.5 ${statusColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${statusColor}`}>
                      {status === "approved" ? "Approved" : status === "rejected" ? "Rejected — please re-upload" : "Pending review"}
                    </p>
                    {latest.admin_notes && (
                      <p className="mt-1 text-xs text-muted-foreground">Admin note: {latest.admin_notes}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Submitted {new Date(latest.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {status === "approved" ? (
              <div className="rounded-xl border border-border bg-card p-6">
                <p className="text-sm font-medium mb-2 flex items-center gap-2"><FileCheck className="h-4 w-4 text-emerald-600" /> You're verified</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {walletActivated
                    ? "Your wallet is active. You can now create offline offers."
                    : "Activate your wallet next to start creating offers."}
                </p>
                {walletActivated ? (
                  <Link to="/offline/offers"><Button size="sm">Go to Offers <ArrowRight className="ml-2 h-3.5 w-3.5" /></Button></Link>
                ) : (
                  <Link to="/wallet"><Button size="sm"><WalletIcon className="mr-2 h-3.5 w-3.5" /> Activate Wallet</Button></Link>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Document type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="cac">CAC Certificate</option>
                    <option value="business_license">Business License</option>
                    <option value="other">Other Business Registration</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Upload document (PDF or image)</label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-2 file:text-xs file:font-medium hover:file:bg-primary/90"
                  />
                  {file && <p className="mt-1.5 text-xs text-muted-foreground">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
                </div>
                {status === "rejected" && (
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Notes for admin (optional)</label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={3} placeholder="Anything we should know about this re-upload..." />
                  </div>
                )}
                <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
                  {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="mr-2 h-4 w-4" /> Submit for verification</>}
                </Button>
              </div>
            )}

            {!latest && (
              <div className="rounded-md border border-border bg-muted/40 p-3 flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Your dashboard will unlock after the admin approves this document and you activate your wallet.</span>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
