import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthSplitShell from "@/components/auth/AuthSplitShell";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassButton } from "@/components/ui/glass-button";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function ExtensionAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        setToken(data.session.access_token);
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.session?.access_token) {
      setToken(data.session.access_token);
      toast.success("Signed in! Copy your token below.");
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    toast.success("Token copied! Paste it in the extension popup.");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <AuthSplitShell
      eyebrow="Extension"
      title="Connect Karbali Extension"
      description="Sign in to get your access token for the browser extension"
      footer={
        <span>
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </span>
      }
    >
      {!token ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <GlassInput
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <GlassInput
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <GlassButton type="submit" variant="glow" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </GlassButton>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              ✅ Signed in! Copy this token and paste it in the Karbali extension popup.
            </p>
            <div className="relative">
              <textarea
                readOnly
                value={token}
                className="w-full h-20 rounded-md bg-background border border-border p-2 text-xs font-mono text-foreground resize-none"
              />
            </div>
            <GlassButton
              variant="glow"
              className="w-full mt-3"
              onClick={handleCopy}
            >
              {copied ? "✓ Copied!" : "Copy Token"}
            </GlassButton>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Open the Karbali extension → "Enter token manually" → paste this token.
          </p>
        </div>
      )}
    </AuthSplitShell>
  );
}