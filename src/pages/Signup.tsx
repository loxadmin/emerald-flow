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

// Public email providers
const PUBLIC_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com",
  "aol.com", "icloud.com", "mail.com", "protonmail.com", "zoho.com",
  "yandex.com", "gmx.com", "fastmail.com", "tutanota.com", "hey.com",
  "pm.me", "proton.me", "qq.com", "163.com", "126.com",
  "msn.com", "me.com", "mac.com", "googlemail.com",
];

// Disposable/temporary/bot email domains
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

    // Block email provider domains as websites
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
    <div className="relative flex min-h-screen items-center justify-center px-4 bg-background">
      <FluidCanvas />
      <MotionWrapper className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block group">
            <Logo size={48} className="mx-auto mb-4 group-hover:scale-105 transition-transform" />
            <h1 className="text-3xl font-bold">
              <span className="text-gradient">Karbali</span>
            </h1>
          </Link>
          <p className="mt-2 text-muted-foreground font-medium">Create your advertiser account</p>
        </div>
        <GlassCard variant="strong">
          <GlassCardHeader>
            <GlassCardTitle>Sign Up</GlassCardTitle>
            <GlassCardDescription>Register with your business email</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Full Name *</Label>
                <GlassInput value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} required autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Company Name</Label>
                <GlassInput value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={100} autoComplete="organization" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Website *</Label>
                <GlassInput
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  maxLength={255}
                  placeholder="yourbusiness.com"
                  autoComplete="url"
                  required
                />
                {isForbiddenDomain ? (
                  <p className="text-xs text-destructive">
                    Email provider domains are not accepted. Please use your business website.
                  </p>
                ) : websiteDomain ? (
                  <p className="text-xs text-muted-foreground/60">
                    Your email must end with @{websiteDomain}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Business Email *</Label>
                <GlassInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  required
                  autoComplete="email"
                  placeholder={websiteDomain && !isForbiddenDomain ? `you@${websiteDomain}` : "you@yourbusiness.com"}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Password *</Label>
                <GlassInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} required autoComplete="new-password" />
                <p className="text-xs text-muted-foreground/60">Minimum 8 characters</p>
              </div>
              <GlassButton type="submit" className="w-full" variant="glow" disabled={loading || !!isForbiddenDomain}>
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
