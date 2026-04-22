import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import MotionWrapper from "@/components/MotionWrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageCircle, ShieldCheck, Loader2, Send } from "lucide-react";

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return "";
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export default function WhatsAppVerify() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [enteredCode, setEnteredCode] = useState("");
  const [adminWa, setAdminWa] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const [{ data: profile }, { data: setting }] = await Promise.all([
        supabase.from("profiles").select("whatsapp_phone, whatsapp_verified, whatsapp_otp_code, whatsapp_otp_expires_at").eq("id", user.id).maybeSingle(),
        supabase.from("admin_settings").select("value").eq("key", "admin_whatsapp_number").maybeSingle(),
      ]);
      setAdminWa((setting as any)?.value || "");
      if (profile) {
        setPhone((profile as any).whatsapp_phone || "");
        setVerified(!!(profile as any).whatsapp_verified);
        const expires = (profile as any).whatsapp_otp_expires_at ? new Date((profile as any).whatsapp_otp_expires_at) : null;
        if ((profile as any).whatsapp_otp_code && expires && expires > new Date()) {
          setCode((profile as any).whatsapp_otp_code);
        }
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const sendCode = async () => {
    const normalized = normalizePhone(phone);
    if (!/^\+\d{8,15}$/.test(normalized)) {
      toast.error("Enter a valid WhatsApp number in international format (e.g. +2348012345678)");
      return;
    }
    if (!user?.id) return;
    setSaving(true);
    const newCode = genCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({
        whatsapp_phone: normalized,
        whatsapp_otp_code: newCode,
        whatsapp_otp_expires_at: expires,
        whatsapp_verified: false,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) { toast.error("Could not generate code. Please try again."); return; }
    setPhone(normalized);
    setCode(newCode);
    setVerified(false);
    toast.success("Code generated. Tap the WhatsApp button to send it from your number.");
  };

  const waLink = useMemo(() => {
    if (!code || !adminWa) return null;
    const target = adminWa.replace(/[^\d]/g, "");
    const text = encodeURIComponent(`Karbali WhatsApp verification code: ${code} (from ${phone})`);
    return `https://wa.me/${target}?text=${text}`;
  }, [code, adminWa, phone]);

  const verify = async () => {
    if (!user?.id) return;
    if (!/^\d{6}$/.test(enteredCode)) { toast.error("Enter the 6-digit code"); return; }
    setVerifying(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("whatsapp_otp_code, whatsapp_otp_expires_at")
      .eq("id", user.id)
      .maybeSingle();
    const expires = (profile as any)?.whatsapp_otp_expires_at ? new Date((profile as any).whatsapp_otp_expires_at) : null;
    if (!profile || (profile as any).whatsapp_otp_code !== enteredCode || !expires || expires <= new Date()) {
      setVerifying(false);
      toast.error("Invalid or expired code");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ whatsapp_verified: true, whatsapp_otp_code: null, whatsapp_otp_expires_at: null })
      .eq("id", user.id);
    setVerifying(false);
    if (error) { toast.error("Verification failed"); return; }
    setVerified(true);
    toast.success("WhatsApp number verified");
    setTimeout(() => navigate("/campaigns/create", { replace: true }), 800);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <MotionWrapper className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </MotionWrapper>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <MotionWrapper className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            Verify your WhatsApp number
          </h1>
          <p className="text-sm text-muted-foreground">
            Before you create your first campaign, please add and verify a WhatsApp number we can reach you on.
          </p>
        </div>

        {verified ? (
          <Card className="p-6 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold">WhatsApp verified</p>
                <p className="text-sm text-muted-foreground">{phone}</p>
              </div>
            </div>
            <Button className="mt-4" onClick={() => navigate("/campaigns/create")}>Continue to create campaign</Button>
          </Card>
        ) : (
          <>
            <Card className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">WhatsApp number (international format)</Label>
                <Input
                  id="phone"
                  placeholder="+2348012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">Include country code, no spaces.</p>
              </div>
              <Button onClick={sendCode} disabled={saving || !phone.trim()}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : "Generate verification code"}
              </Button>
            </Card>

            {code && waLink && (
              <Card className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Your verification code</p>
                  <p className="text-3xl font-bold tracking-widest text-primary">{code}</p>
                  <p className="text-xs text-muted-foreground mt-1">Expires in 15 minutes.</p>
                </div>
                <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                  <li>Tap the button below to open WhatsApp on your phone.</li>
                  <li>Send the pre-filled message to our team from the number you want to verify ({phone}).</li>
                  <li>Come back here and enter the 6-digit code to confirm.</li>
                </ol>
                <a href={waLink} target="_blank" rel="noreferrer">
                  <Button className="w-full" variant="default">
                    <Send className="mr-2 h-4 w-4" />
                    Send code via WhatsApp
                  </Button>
                </a>

                <div className="pt-4 border-t space-y-2">
                  <Label htmlFor="otp">Enter the 6-digit code</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    maxLength={6}
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="text-center tracking-widest text-lg"
                  />
                  <Button onClick={verify} disabled={verifying || enteredCode.length !== 6} className="w-full">
                    {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Verify number"}
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </MotionWrapper>
    </DashboardLayout>
  );
}
