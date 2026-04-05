import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import MotionWrapper from "@/components/MotionWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, Handshake, XCircle } from "lucide-react";

interface ReferralProgram {
  id: string;
  advertiser_id: string;
  campaign_id: string;
  status: string;
  referral_guide: string;
  compensation_structure: string;
  registration_link: string;
  admin_referral_code: string | null;
  admin_referral_link: string | null;
  activation_fee_paid: boolean;
  admin_notes: string | null;
  created_at: string;
  advertiser_email?: string;
  campaign_name?: string;
}

interface ProgramEditState {
  admin_referral_code: string;
  admin_referral_link: string;
  admin_notes: string;
}

export default function AdminPartnerships() {
  const [programs, setPrograms] = useState<ReferralProgram[]>([]);
  const [edits, setEdits] = useState<Record<string, ProgramEditState>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchPrograms = async () => {
    setLoading(true);

    const { data: programData, error } = await supabase
      .from("external_referral_programs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const nextPrograms = (programData || []) as ReferralProgram[];
    const advertiserIds = [...new Set(nextPrograms.map((program) => program.advertiser_id))];
    const campaignIds = [...new Set(nextPrograms.map((program) => program.campaign_id))];

    const [{ data: profiles }, { data: campaigns }] = await Promise.all([
      advertiserIds.length > 0 ? supabase.from("profiles").select("id, email").in("id", advertiserIds) : Promise.resolve({ data: [] }),
      campaignIds.length > 0 ? supabase.from("campaigns").select("id, name").in("id", campaignIds) : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile.email]));
    const campaignMap = new Map((campaigns || []).map((campaign) => [campaign.id, campaign.name]));

    setPrograms(nextPrograms.map((program) => ({
      ...program,
      advertiser_email: profileMap.get(program.advertiser_id) || "Unknown advertiser",
      campaign_name: campaignMap.get(program.campaign_id) || "Untitled campaign",
    })));

    setEdits(Object.fromEntries(nextPrograms.map((program) => [program.id, {
      admin_referral_code: program.admin_referral_code || "",
      admin_referral_link: program.admin_referral_link || "",
      admin_notes: program.admin_notes || "",
    }])));
    setLoading(false);
  };

  useEffect(() => {
    void fetchPrograms();
  }, []);

  const updateProgramStatus = async (program: ReferralProgram, status: "approved" | "rejected") => {
    setSavingId(program.id);
    const editState = edits[program.id] || { admin_referral_code: "", admin_referral_link: "", admin_notes: "" };

    const { error } = await supabase
      .from("external_referral_programs")
      .update({
        status,
        admin_referral_code: editState.admin_referral_code || null,
        admin_referral_link: editState.admin_referral_link || null,
        admin_notes: editState.admin_notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", program.id);

    setSavingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Referral request ${status}`);
    void fetchPrograms();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <MotionWrapper>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Partnership Requests</h1>
            <p className="text-muted-foreground">Review advertiser external referral program submissions and respond with admin referral details.</p>
          </div>
        </MotionWrapper>

        <MotionWrapper delay={0.05}>
          <div className="rounded-xl border border-border bg-card">
            <div className="p-5 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground flex items-center gap-2"><Handshake className="h-4 w-4 text-primary" /> External Referral Programs</h2>
              <Badge variant="outline" className="text-xs">{programs.length} total</Badge>
            </div>

            <div className="px-5 pb-5 space-y-4">
              {loading ? (
                <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              ) : programs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No partnership requests yet.</p>
              ) : (
                programs.map((program) => {
                  const editState = edits[program.id] || { admin_referral_code: "", admin_referral_link: "", admin_notes: "" };
                  const isPending = program.status === "pending";

                  return (
                    <div key={program.id} className="rounded-xl border border-border p-4 space-y-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{program.campaign_name}</p>
                            <Badge variant="outline" className={isPending ? "text-amber-600 border-amber-500/20 bg-amber-500/5" : program.status === "approved" ? "text-primary border-primary/20 bg-primary/5" : "text-destructive border-destructive/20 bg-destructive/5"}>
                              {program.status}
                            </Badge>
                            <Badge variant="outline" className={program.activation_fee_paid ? "text-primary border-primary/20 bg-primary/5" : "text-muted-foreground border-border"}>
                              {program.activation_fee_paid ? "Activation paid" : "Activation pending"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{program.advertiser_email}</p>
                          <p className="text-xs text-muted-foreground mt-1">Submitted {new Date(program.created_at).toLocaleString()}</p>
                        </div>
                        <a href={program.registration_link} target="_blank" rel="noreferrer" className="text-xs text-primary underline underline-offset-4">
                          Open advertiser referral portal
                        </a>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-foreground mb-1">Referral guide</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{program.referral_guide}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground mb-1">Compensation structure</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{program.compensation_structure}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Admin referral code</label>
                            <Input
                              value={editState.admin_referral_code}
                              onChange={(event) => setEdits((current) => ({
                                ...current,
                                [program.id]: { ...editState, admin_referral_code: event.target.value },
                              }))}
                              placeholder="Optional code to use on the partner platform"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Admin referral link</label>
                            <Input
                              value={editState.admin_referral_link}
                              onChange={(event) => setEdits((current) => ({
                                ...current,
                                [program.id]: { ...editState, admin_referral_link: event.target.value },
                              }))}
                              placeholder="Optional partner link"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Admin notes</label>
                            <Textarea
                              rows={4}
                              value={editState.admin_notes}
                              onChange={(event) => setEdits((current) => ({
                                ...current,
                                [program.id]: { ...editState, admin_notes: event.target.value },
                              }))}
                              placeholder="Internal notes or advertiser response"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => updateProgramStatus(program, "approved")} disabled={!isPending || savingId === program.id}>
                          <CheckCircle className="mr-2 h-4 w-4" /> Approve
                        </Button>
                        <Button variant="outline" onClick={() => updateProgramStatus(program, "rejected")} disabled={!isPending || savingId === program.id}>
                          <XCircle className="mr-2 h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </MotionWrapper>
      </div>
    </AdminLayout>
  );
}