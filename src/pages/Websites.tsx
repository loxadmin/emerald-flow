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
      <div className="space-y-6 max-w-3xl">
        <MotionWrapper>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Websites</h1>
            <p className="text-sm text-muted-foreground">Manage and verify your business websites</p>
          </div>
        </MotionWrapper>

        {/* Add new website */}
        <MotionWrapper delay={0.05}>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-medium text-foreground mb-4">Add Website</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Domain</Label>
                <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="example.com" />
              </div>
              <Button onClick={addWebsite} disabled={adding} className="sm:mt-6">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" /> Add</>}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">You'll need to verify ownership via an email sent to admin@yourdomain.com</p>
          </div>
        </MotionWrapper>

        {/* Websites list */}
        <MotionWrapper delay={0.1}>
          <div className="rounded-xl border border-border bg-card">
            <div className="p-5 pb-3">
              <h3 className="text-sm font-medium text-foreground">Your Websites</h3>
            </div>
            <div className="px-5 pb-5">
              {loading ? (
                <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              ) : websites.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No websites added yet</p>
              ) : (
                <div className="divide-y divide-border">
                  {websites.map((w) => (
                    <div key={w.id} className="py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{w.domain}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${w.is_verified ? "text-primary border-primary/20 bg-primary/5" : "text-amber-600 border-amber-500/20 bg-amber-500/5"}`}>
                            {w.is_verified ? <><ShieldCheck className="h-2.5 w-2.5 mr-0.5" /> Verified</> : "Unverified"}
                          </Badge>
                        </div>
                        {!w.is_verified && verifyingId !== w.id && (
                          <Button variant="outline" size="sm" onClick={() => sendOtp(w.id, w.domain)} disabled={sendingOtp === w.id}>
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </MotionWrapper>
      </div>
    </DashboardLayout>
  );
}
