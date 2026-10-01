import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthSplitShell from "@/components/auth/AuthSplitShell";
import { friendlyError } from "@/lib/errors";

export default function AffiliateLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return toast.error("Please fill in all fields");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { toast.error(friendlyError(error)); return; }
      localStorage.setItem("karbali-ads-last-activity", String(Date.now()));
      const { data: aff } = await supabase
        .from("affiliates").select("id").eq("user_id", data.user!.id).maybeSingle();
      if (!aff) {
        await supabase.auth.signOut();
        toast.error("No affiliate account found for this email. Register as an affiliate first.");
        return;
      }
      toast.success("Welcome back");
      navigate("/affiliate/dashboard", { replace: true });
    } catch (err) {
      toast.error(friendlyError(err, "Oops! Something went wrong!"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitShell
      eyebrow="Affiliates"
      title="Affiliate sign in"
      description="Access your referrals, earnings and withdrawals."
      footer={
        <div className="space-y-2">
          <p>
            Not an affiliate yet?{" "}
            <Link to="/affiliates" className="font-medium text-primary hover:text-primary/80">Join the program</Link>
          </p>
          <p>
            Got a setup code?{" "}
            <Link to="/affiliate/setup" className="font-medium text-primary hover:text-primary/80">Set your password</Link>
          </p>
        </div>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="aff-login-email" className="text-sm">Email address</Label>
          <Input id="aff-login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            maxLength={255} required autoComplete="email" placeholder="you@example.com" className="h-11 rounded-lg px-4" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aff-login-password" className="text-sm">Password</Label>
          <div className="relative">
            <Input id="aff-login-password" type={show ? "text" : "password"} value={password}
              onChange={(e) => setPassword(e.target.value)} maxLength={128} required autoComplete="current-password"
              placeholder="Enter your password" className="h-11 rounded-lg px-4 pr-12" />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <GlassButton type="submit" variant="glow" className="h-11 w-full rounded-lg" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </GlassButton>
      </form>
    </AuthSplitShell>
  );
}
