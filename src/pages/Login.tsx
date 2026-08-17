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

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        toast.error(friendlyError(error));
      } else {
        toast.success("Logged in successfully");
        localStorage.setItem("karbali-ads-last-activity", String(Date.now()));
        await supabase.auth.getSession();
        const userId = data.user?.id;

        if (userId) {
          const { data: rolesData, error: rolesError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);

          if (rolesError) console.error("Role lookup failed:", rolesError);
          const hasAdminRole = (rolesData || []).some((role) => role.role === "admin");
          navigate(hasAdminRole ? "/ella" : "/dashboard", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    } catch (err) {
      console.error("Login exception:", err);
      toast.error("Oops! Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitShell
      eyebrow="Welcome back"
      title="Welcome to Karbali Ads"
      description="Enter your credentials to access your dashboard."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-medium text-primary transition-colors hover:text-primary/80">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm text-foreground">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
            required
            autoComplete="email"
            className="h-11 rounded-lg border-border bg-background px-4"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm text-foreground">Password</Label>
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
              className="h-11 rounded-lg border-border bg-background px-4 pr-12"
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <GlassButton type="submit" className="h-11 w-full rounded-lg" variant="glow" disabled={loading}>
          {loading ? "Signing in..." : "Log in"}
        </GlassButton>
      </form>
    </AuthSplitShell>
  );
}
