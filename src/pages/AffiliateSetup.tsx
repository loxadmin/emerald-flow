import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import Seo from "@/components/Seo";
import { functionError } from "@/lib/errors";

export default function AffiliateSetup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("affiliate-setup", {
        body: { email: email.trim(), code: code.trim(), password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInErr) {
        toast.success("Password set. Please sign in.");
        navigate("/login", { replace: true });
        return;
      }
      toast.success("Welcome aboard 🎉");
      navigate("/affiliate/dashboard", { replace: true });
    } catch (err) {
      toast.error(await functionError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <Seo
        title="Affiliate setup — Karbali Ads"
        description="Redeem your one-time affiliate code and set a password for your Karbali affiliate dashboard."
      />
      <div className="mx-auto w-full max-w-md">
        <Logo />
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">Set your affiliate password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the one-time code we emailed you. It works once.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">One-time code</Label>
              <Input id="code" required maxLength={16} value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono tracking-[0.3em]" placeholder="A1B2C3D4" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" autoComplete="new-password" required minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" autoComplete="new-password" required minLength={8}
                value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Setting up…" : "Set password and continue"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
