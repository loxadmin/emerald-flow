import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import AuthSplitShell from "@/components/auth/AuthSplitShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassButton } from "@/components/ui/glass-button";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";

export const ADMIN_2FA_FLAG = "karbali-admin-2fa-verified";

export default function Admin2FA() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useAuth();
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sentOnce, setSentOnce] = useState(false);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    if (!isAdmin) { navigate("/dashboard", { replace: true }); return; }
    if (sessionStorage.getItem(ADMIN_2FA_FLAG) === "1") {
      navigate("/admin", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin, isLoading]);

  const sendCode = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-2fa", { body: { action: "send" } });
    setSending(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Failed to send code"); return; }
    setSentOnce(true);
    if (data?.email_sent) {
      toast.success("Code sent to your email");
    } else {
      toast.error(data?.email_error ? `Email send failed: ${data.email_error}` : "Email not configured — contact support");
    }
  };

  useEffect(() => {
    if (!isAdmin || !user?.id) return;
    if (autoSentRef.current) return;
    if (sessionStorage.getItem(ADMIN_2FA_FLAG) === "1") return;
    // Only auto-send once per session per user — survives tab refocus/refresh
    const autoSentKey = `karbali-admin-2fa-autosent-${user.id}`;
    if (sessionStorage.getItem(autoSentKey) === "1") {
      autoSentRef.current = true;
      setSentOnce(true);
      return;
    }
    autoSentRef.current = true;
    sessionStorage.setItem(autoSentKey, "1");
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, user?.id]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { toast.error("Enter the 6-digit code"); return; }
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke("admin-2fa", { body: { action: "verify", code } });
    setVerifying(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Verification failed"); return; }
    sessionStorage.setItem(ADMIN_2FA_FLAG, "1");
    toast.success("Verified");
    navigate("/admin", { replace: true });
  };

  return (
    <AuthSplitShell
      eyebrow="Admin verification"
      title="Two-factor required"
      description="A 6-digit code was sent to your admin email. Enter it to continue."
      footer={<span>Lost access? Contact another admin.</span>}
    >
      <form onSubmit={verify} className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" /> {user?.email}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code">6-digit code</Label>
          <Input
            id="code" inputMode="numeric" pattern="\d{6}" maxLength={6}
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456" className="h-11 text-center tracking-widest text-lg"
          />
        </div>
        <GlassButton type="submit" className="h-11 w-full" variant="glow" disabled={verifying || code.length !== 6}>
          {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Verify & Continue"}
        </GlassButton>
        <button type="button" className="text-xs text-muted-foreground hover:text-foreground"
          onClick={sendCode} disabled={sending}>
          {sending ? "Sending..." : "Resend code"}
        </button>
      </form>
    </AuthSplitShell>
  );
}
