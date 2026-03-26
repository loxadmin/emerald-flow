import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import { Label } from "@/components/ui/label";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !fullName.trim()) { toast.error("Please fill in all required fields"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: fullName.trim(), company_name: companyName.trim() }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) { toast.error(error.message); } else { toast.success("Account created! Check your email to confirm."); navigate("/login"); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <FluidCanvas />
      <MotionWrapper className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight"><span className="text-gradient">Karbali</span></h1>
          <p className="mt-2 text-white/40">Create your advertiser account</p>
        </div>
        <GlassCard variant="strong">
          <GlassCardHeader>
            <GlassCardTitle>Sign Up</GlassCardTitle>
            <GlassCardDescription>Start tracking performance-based campaigns</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/60 text-sm">Full Name *</Label>
                <GlassInput id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} required />
              </div>
              <div className="space-y-2">
                <Label className="text-white/60 text-sm">Company Name</Label>
                <GlassInput id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label className="text-white/60 text-sm">Email *</Label>
                <GlassInput id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required />
              </div>
              <div className="space-y-2">
                <Label className="text-white/60 text-sm">Password *</Label>
                <GlassInput id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} required />
                <p className="text-xs text-white/30">Minimum 8 characters</p>
              </div>
              <GlassButton type="submit" className="w-full" variant="glow" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </GlassButton>
            </form>
            <div className="mt-4 text-center text-sm text-white/40">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:text-primary/80 transition-colors">Sign in</Link>
            </div>
          </GlassCardContent>
        </GlassCard>
      </MotionWrapper>
    </div>
  );
}
