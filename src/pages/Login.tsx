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
import { Eye, EyeOff } from "lucide-react";
import Logo from "@/components/Logo";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("Please fill in all fields"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) { toast.error(error.message); } else { toast.success("Logged in successfully"); navigate("/dashboard"); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <FluidCanvas />
      <MotionWrapper className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo size={48} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-gradient">Karbali</span>
          </h1>
          <p className="mt-2 text-white/40">Performance Attribution Platform</p>
        </div>
        <GlassCard variant="strong">
          <GlassCardHeader>
            <GlassCardTitle>Sign In</GlassCardTitle>
            <GlassCardDescription>Enter your credentials to access your dashboard</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/60 text-sm">Email</Label>
                <GlassInput id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required />
              </div>
              <div className="space-y-2">
                <Label className="text-white/60 text-sm">Password</Label>
                <div className="relative">
                  <GlassInput id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} required />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <GlassButton type="submit" className="w-full" variant="glow" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </GlassButton>
            </form>
            <div className="mt-4 text-center text-sm text-white/40">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:text-primary/80 transition-colors">Sign up</Link>
            </div>
          </GlassCardContent>
        </GlassCard>
      </MotionWrapper>
    </div>
  );
}
