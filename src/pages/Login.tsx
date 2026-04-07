import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
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
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Logged in successfully");
        localStorage.setItem("karbali-last-activity", String(Date.now()));
        
        await supabase.auth.getSession();
        const userId = data.user?.id;
        if (userId) {
          const { data: rolesData, error: rolesError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);

          if (rolesError) console.error("Role lookup failed:", rolesError);

          const hasAdminRole = (rolesData || []).some((role) => role.role === "admin");
          navigate(hasAdminRole ? "/admin" : "/dashboard", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    } catch (err) {
      console.error("Login exception:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Marketing */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-center px-12 xl:px-20 bg-card border-r border-border">
        <div className="max-w-md">
          <Logo size={40} className="mb-8" />

          <h1 className="text-3xl xl:text-4xl font-bold text-foreground leading-tight mb-4">
            Welcome back to the customer migration platform:
          </h1>

          <ul className="space-y-3 mb-10">
            {[
              "Track campaign performance in real-time",
              "Manage referrals and milestones",
              "Pay only for verified results",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-primary">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-foreground font-medium">{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-xl font-bold text-foreground mb-4">Your dashboard awaits</h2>
          <ul className="space-y-3">
            {[
              "View active campaigns & analytics",
              "Monitor wallet & transactions",
              "Manage your integration",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-primary">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-foreground font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="lg:hidden mb-6">
              <Logo size={40} className="mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Sign in to your account</h2>
            <p className="mt-2 text-muted-foreground text-sm">
              Enter your credentials to access your dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm text-foreground">Email address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@yourbusiness.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
                autoComplete="email"
                className="h-11 bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm text-foreground">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={128}
                  required
                  autoComplete="current-password"
                  className="h-11 bg-background border-border pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <GlassButton type="submit" className="w-full h-11" variant="glow" disabled={loading}>
              {loading ? "Signing in..." : "Continue"}
            </GlassButton>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:text-primary/80 transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
