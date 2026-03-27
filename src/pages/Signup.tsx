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
import Logo from "@/components/Logo";

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
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { full_name: fullName.trim(), company_name: companyName.trim() }, emailRedirectTo: window.location.origin },
      });
      if (error) { toast.error(error.message); } else { toast.success("Account created! Check your email to confirm."); navigate("/login"); }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 bg-background">
      <FluidCanvas />
      <MotionWrapper className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo size={48} className="mx-auto mb-4" />
          <h1 className="text-3xl">
            <span className="text-gradient">Karbali</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Create your advertiser account</p>
        </div>
        <GlassCard variant="strong">
          <GlassCardHeader>
            <GlassCardTitle>Sign Up</GlassCardTitle>
            <GlassCardDescription>Start tracking performance-based campaigns</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Full Name *</Label>
                <GlassInput id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} required autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Company Name</Label>
                <GlassInput id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={100} autoComplete="organization" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Email *</Label>
                <GlassInput id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Password *</Label>
                <GlassInput id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} required autoComplete="new-password" />
                <p className="text-xs text-muted-foreground/60">Minimum 8 characters</p>
              </div>
              <GlassButton type="submit" className="w-full" variant="glow" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </GlassButton>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:text-primary/80 transition-colors">Sign in</Link>
            </div>
          </GlassCardContent>
        </GlassCard>
      </MotionWrapper>
    </div>
  );
}
