import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthSplitShell from "@/components/auth/AuthSplitShell";

const PUBLIC_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com",
  "aol.com", "icloud.com", "mail.com", "protonmail.com", "zoho.com",
  "yandex.com", "gmx.com", "fastmail.com", "tutanota.com", "hey.com",
  "pm.me", "proton.me", "qq.com", "163.com", "126.com",
  "msn.com", "me.com", "mac.com", "googlemail.com",
];

const DISPOSABLE_DOMAINS = [
  "example.com", "example.org", "example.net", "test.com", "test.org",
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "tempmail.com", "throwaway.email", "temp-mail.org", "fakeinbox.com",
  "sharklasers.com", "guerrillamailblock.com", "grr.la", "dispostable.com",
  "yopmail.com", "yopmail.fr", "trashmail.com", "trashmail.me", "trashmail.net",
  "mailnesia.com", "maildrop.cc", "discard.email", "discardmail.com",
  "mailcatch.com", "mintemail.com", "tempail.com", "mohmal.com",
  "burnermail.io", "mailnator.com", "getnada.com", "nada.email",
  "tempinbox.com", "tempr.email", "10minutemail.com", "10minutemail.net",
  "harakirimail.com", "emailondeck.com", "33mail.com", "maildax.com",
  "binkmail.com", "bobmail.info", "chammy.info", "devnullmail.com",
  "letthemeatspam.com", "mailexpire.com", "mailmoat.com", "mailnull.com",
  "mailshell.com", "mailzilla.com", "nomail.xl.cx", "nowmymail.com",
  "spamfree24.org", "spamgourmet.com", "spamhole.com", "trashymail.com",
  "jetable.org", "mailforspam.com", "safetymail.info", "getairmail.com",
  "filzmail.com", "inboxalias.com", "mailblocks.com", "mailscrap.com",
  "einrot.com", "cuvox.de", "armyspy.com", "dayrep.com", "fleckens.hu",
  "gustr.com", "jourrapide.com", "rhyta.com", "superrito.com", "teleworm.us",
  "tempomail.fr", "tmpmail.net", "tmpmail.org", "trash-mail.com",
  "bugmenot.com", "notmailinator.com", "spamevader.com",
  "localhost", "invalid.com", "nowhere.com", "noone.com",
];

const FORBIDDEN_DOMAINS = [...PUBLIC_EMAIL_DOMAINS, ...DISPOSABLE_DOMAINS];

function extractDomain(url: string): string {
  try {
    let cleaned = url.trim().toLowerCase();
    if (!cleaned.startsWith("http")) cleaned = "https://" + cleaned;
    return new URL(cleaned).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !fullName.trim() || !website.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    const websiteDomain = extractDomain(website);
    if (!websiteDomain) {
      toast.error("Please enter a valid website URL");
      return;
    }

    if (FORBIDDEN_DOMAINS.includes(websiteDomain)) {
      toast.error("Please provide a professional business website, not a public email provider.");
      return;
    }

    const emailDomain = email.trim().toLowerCase().split("@")[1];
    if (emailDomain !== websiteDomain) {
      toast.error(`Your email must use your website domain (@${websiteDomain})`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            company_name: companyName.trim(),
            website: website.trim(),
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! Check your email to confirm.");
        navigate("/login");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const websiteDomain = extractDomain(website);
  const isForbiddenDomain = websiteDomain && FORBIDDEN_DOMAINS.includes(websiteDomain);

  return (
    <AuthSplitShell
      eyebrow="Create account"
      title="Sign Up"
      description="Register with your business email to start tracking."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary transition-colors hover:text-primary/80">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="full-name" className="text-sm text-foreground">Full Name *</Label>
          <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} required autoComplete="name" className="h-11 rounded-xl border-border/40 bg-background px-4" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company-name" className="text-sm text-foreground">Company Name</Label>
          <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={100} autoComplete="organization" className="h-11 rounded-xl border-border/40 bg-background px-4" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="website" className="text-sm text-foreground">Website *</Label>
          <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={255} placeholder="yourbusiness.com" autoComplete="url" required className="h-11 rounded-xl border-border/40 bg-background px-4" />
          {isForbiddenDomain ? (
            <p className="text-xs text-destructive">Email provider domains are not accepted.</p>
          ) : websiteDomain ? (
            <p className="text-xs text-muted-foreground">Your email must end with @{websiteDomain}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm text-foreground">Business Email *</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required autoComplete="email" placeholder={websiteDomain && !isForbiddenDomain ? `you@${websiteDomain}` : "you@yourbusiness.com"} className="h-11 rounded-xl border-border/40 bg-background px-4" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm text-foreground">Password *</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} required autoComplete="new-password" className="h-11 rounded-xl border-border/40 bg-background px-4" />
          <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
        </div>

        <GlassButton type="submit" className="mt-2 h-12 w-full rounded-xl" variant="glow" disabled={loading || !!isForbiddenDomain}>
          {loading ? "Creating account..." : "Create Account"}
        </GlassButton>
      </form>
    </AuthSplitShell>
  );
}
