import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import Logo from "@/components/Logo";

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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Marketing */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-center px-12 xl:px-20 bg-card border-r border-border">
        <div className="max-w-md">
          <Logo size={40} className="mb-8" />
          
          <h1 className="text-3xl xl:text-4xl font-bold text-foreground leading-tight mb-4">
            Start your free trial today to grow your brand with no strings attached:
          </h1>

          <ul className="space-y-3 mb-10">
            {[
              "No upfront costs required",
              "Pay only for real results",
              "Full access to migration tools",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-primary">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-foreground font-medium">{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-xl font-bold text-foreground mb-4">Get up and running</h2>
          <ul className="space-y-3 mb-10">
            {[
              "Verify your business domain",
              "Create your first campaign",
              "Start acquiring customers!",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-primary">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-foreground font-medium">{item}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">
            *Campaigns are performance-based. You only pay when users complete milestones you define.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="lg:hidden mb-6">
              <Logo size={40} className="mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Sign up for free</h2>
            <p className="mt-2 text-muted-foreground text-sm">
              Create your advertiser account and start migrating customers today.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm text-foreground">Full name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
                required
                autoComplete="name"
                className="h-11 bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-sm text-foreground">Company name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                maxLength={100}
                autoComplete="organization"
                className="h-11 bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website" className="text-sm text-foreground">Website *</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                maxLength={255}
                placeholder="yourbusiness.com"
                autoComplete="url"
                required
                className="h-11 bg-background border-border"
              />
              {isForbiddenDomain ? (
                <p className="text-xs text-destructive">
                  Email provider domains are not accepted. Please use your business website.
                </p>
              ) : websiteDomain ? (
                <p className="text-xs text-muted-foreground">
                  Your email must end with @{websiteDomain}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm text-foreground">Business email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
                autoComplete="email"
                placeholder={websiteDomain && !isForbiddenDomain ? `you@${websiteDomain}` : "you@yourbusiness.com"}
                className="h-11 bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm text-foreground">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={128}
                  required
                  autoComplete="new-password"
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
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            </div>

            <p className="text-xs text-muted-foreground">
              By clicking Continue, you agree to the{" "}
              <span className="text-primary cursor-pointer">Terms of Service</span> and{" "}
              <span className="text-primary cursor-pointer">Privacy Policy</span>.
            </p>

            <GlassButton type="submit" className="w-full h-11" variant="glow" disabled={loading || !!isForbiddenDomain}>
              {loading ? "Creating account..." : "Continue"}
            </GlassButton>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
