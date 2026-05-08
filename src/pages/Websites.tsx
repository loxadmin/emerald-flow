import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Globe, Plus, CheckCircle, AlertCircle, Loader2, Mail, ShieldCheck } from "lucide-react";

interface Website {
  id: string; domain: string; is_verified: boolean; created_at: string;
}

export default function WebsitesPage() {
  const { user } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [sendingOtp, setSendingOtp] = useState<string | null>(null);

  const fetchWebsites = async () => {
    if (!user) return;
    const { data } = await supabase.from("advertiser_websites" as any).select("*").eq("advertiser_id", user.id).order("created_at");
    setWebsites((data as any as Website[]) || []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchWebsites(); }, [user?.id]);

  const addWebsite = async () => {
    if (!user) return;
    let domain = newDomain.trim().toLowerCase();
    // Extract domain from URL
    try { domain = new URL(domain.startsWith("http") ? domain : `https://${domain}`).hostname; } catch {}
    if (!domain || !domain.includes(".")) { toast.error("Please enter a valid domain"); return; }
    setAdding(true);
    const { error } = await supabase.from("advertiser_websites" as any).insert({
      advertiser_id: user.id, domain, is_verified: false,
    } as any);
    if (error) {
      if (error.code === "23505") toast.error("This domain is already registered on the platform by another account");
      else toast.error(error.message);
    } else {
      toast.success("Website added. Please verify it.");
      setNewDomain("");
      fetchWebsites();
    }
    setAdding(false);
  };

  const sendOtp = async (websiteId: string, domain: string) => {
    if (!user) return;
    setSendingOtp(websiteId);
    try {
      const { data, error } = await supabase.functions.invoke("verify-website-otp", {
        body: { action: "send_otp", website_id: websiteId, domain },
      });
      if (error) throw error;
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      if (payload?.success) {
        toast.success(`OTP sent to admin@${domain}. Check your email.`);
        setVerifyingId(websiteId);
      } else {
        toast.error(payload?.error || "Failed to send OTP");
      }
    } catch (err: any) { toast.error(err.message || "Failed to send OTP"); }
    finally { setSendingOtp(null); }
  };

  const verifyOtp = async (websiteId: string) => {
    if (!otpInput.trim()) { toast.error("Enter the OTP code"); return; }
    setSendingOtp(websiteId);
    try {
      const { data, error } = await supabase.functions.invoke("verify-website-otp", {
        body: { action: "verify_otp", website_id: websiteId, otp: otpInput.trim() },
      });
      if (error) throw error;
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      if (payload?.verified) {
        toast.success("Website verified!");
        setVerifyingId(null);
        setOtpInput("");
        fetchWebsites();
      } else {
        toast.error(payload?.error || "Invalid or expired OTP");
      }
    } catch (err: any) { toast.error(err.message || "Verification failed"); }
    finally { setSendingOtp(null); }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <MotionWrapper>
          <div className="space-y-1.5">
            <p className="eyebrow">Setup</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Websites</h1>
            <p className="text-sm text-muted-foreground">Verify ownership of the domains where your campaigns will run.</p>
          </div>
        </MotionWrapper>

        {/* Add new website */}
        <MotionWrapper delay={0.05}>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4">
              <p className="eyebrow mb-0.5">Add domain</p>
              <h3 className="text-base font-semibold tracking-tight">Register a new website</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Domain</Label>
                <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="example.com" className="font-mono" />
              </div>
              <Button onClick={addWebsite} disabled={adding} className="sm:mt-[26px] bg-primary hover:bg-primary/90 text-primary-foreground">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" /> Add domain</>}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              You will receive a one-time verification code at <span className="font-mono text-foreground">admin@yourdomain.com</span>.
            </p>
          </div>
        </MotionWrapper>

        {/* Websites list */}
        <MotionWrapper delay={0.1}>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <p className="eyebrow mb-0.5">Verified domains</p>
              <h3 className="text-base font-semibold tracking-tight">Your websites</h3>
            </div>
            <div>
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : websites.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No websites yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add your first domain above to get started.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {websites.map((w) => (
                    <li key={w.id} className="px-6 py-4 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-medium text-foreground truncate">{w.domain}</p>
                            <Badge variant="outline" className={`mt-0.5 text-[10px] px-1.5 py-0 font-medium uppercase tracking-wider ${w.is_verified ? "text-primary border-primary/25 bg-primary/5" : "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/5"}`}>
                              {w.is_verified ? <><ShieldCheck className="h-2.5 w-2.5 mr-0.5" /> Verified</> : "Unverified"}
                            </Badge>
                          </div>
                        </div>
                        {!w.is_verified && verifyingId !== w.id && (
                          <Button variant="outline" size="sm" onClick={() => sendOtp(w.id, w.domain)} disabled={sendingOtp === w.id} className="border-border">
                            {sendingOtp === w.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Mail className="mr-1 h-3 w-3" /> Send OTP</>}
                          </Button>
                        )}
                      </div>
                      {verifyingId === w.id && !w.is_verified && (
                        <div className="flex items-center gap-2 pl-6">
                          <Input value={otpInput} onChange={(e) => setOtpInput(e.target.value)} placeholder="Enter 6-digit OTP" maxLength={6} className="w-40" />
                          <Button size="sm" onClick={() => verifyOtp(w.id)} disabled={sendingOtp === w.id}>
                            {sendingOtp === w.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setVerifyingId(null); setOtpInput(""); }}>Cancel</Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </MotionWrapper>
      </div>
    </DashboardLayout>
  );
}
