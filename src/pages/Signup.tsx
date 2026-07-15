import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type Subtype =
  | "musician" | "youtuber" | "social_media_creator"
  | "app" | "website" | "fintech" | "game_developers" | "sports_betting"
  | "ecommerce" | "online_vendor" | "realtor"
  | "food_beverage" | "household_items"
  | "telecom" | "oil_gas";

const SUBTYPE_OPTIONS: { id: Subtype; label: string; group: "engagement" | "performance" | "commerce" | "daily_essentials" | "mainstream" }[] = [
  // Online — Engagement
  { id: "musician", label: "Musician / Music Artist", group: "engagement" },
  { id: "youtuber", label: "YouTuber / Video Creator", group: "engagement" },
  { id: "social_media_creator", label: "Social Media Creator", group: "engagement" },
  // Online — Performance
  { id: "app", label: "Mobile App Owner", group: "performance" },
  { id: "website", label: "Website Owner", group: "performance" },
  { id: "fintech", label: "Fintech", group: "performance" },
  { id: "game_developers", label: "Game Developers", group: "performance" },
  { id: "sports_betting", label: "Sports and Betting", group: "performance" },
  // Online — Commerce
  { id: "ecommerce", label: "E-commerce", group: "commerce" },
  { id: "online_vendor", label: "Online Vendor", group: "commerce" },
  { id: "realtor", label: "Realtor / Real Estate", group: "commerce" },
  // Offline — Daily Essentials
  { id: "food_beverage", label: "Food & Beverage Producer (Offline)", group: "daily_essentials" },
  { id: "household_items", label: "Household Items Manufacturer (Offline)", group: "daily_essentials" },
  // Offline — Mainstream
  { id: "telecom", label: "Telecommunications (Offline)", group: "mainstream" },
  { id: "oil_gas", label: "Oil & Gas (Offline)", group: "mainstream" },
];

const CREATOR_SUBTYPES: Subtype[] = ["musician", "youtuber", "social_media_creator"];
const OFFLINE_SUBTYPES: Subtype[] = ["food_beverage", "household_items", "telecom", "oil_gas"];
const isCreator = (s: Subtype | "") => CREATOR_SUBTYPES.includes(s as Subtype);
const isOffline = (s: Subtype | "") => OFFLINE_SUBTYPES.includes(s as Subtype);

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
  const [subtype, setSubtype] = useState<Subtype | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const creator = isCreator(subtype);
  const offline = isOffline(subtype);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subtype) {
      toast.error("Please select what best describes you");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Please accept the Terms & Conditions to continue");
      return;
    }

    if (!email.trim() || !password.trim() || !fullName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    const emailDomain = email.trim().toLowerCase().split("@")[1];
    if (!emailDomain) {
      toast.error("Please enter a valid email");
      return;
    }

    if (DISPOSABLE_DOMAINS.includes(emailDomain)) {
      toast.error("Disposable email addresses are not allowed");
      return;
    }

    let websiteValue = "";

    if (creator || offline) {
      // Creators and offline advertisers can use any email; no website required
      // (Disposable already blocked above.)
    } else {
      // Business advertisers: must have business website matching email domain
      if (!website.trim()) {
        toast.error("Please enter your business website");
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
      if (emailDomain !== websiteDomain) {
        toast.error(`Your email must use your website domain (@${websiteDomain})`);
        return;
      }
      websiteValue = website.trim();
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
            website: websiteValue,
            advertiser_subtype: subtype,
            terms_accepted_at: new Date().toISOString(),
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        // Best-effort: stamp terms_accepted_at on the profile after the trigger creates it.
        try {
          const { data: sess } = await supabase.auth.getSession();
          const uid = sess?.session?.user?.id;
          if (uid) {
            await supabase.from("profiles").update({ terms_accepted_at: new Date().toISOString() }).eq("id", uid);
          }
        } catch { /* profile trigger may not have fired yet — non-fatal */ }
        try {
          const w = window as any;
          if (w.Karbali && w.Karbali.trackSignup) {
            w.Karbali.trackSignup({ user_id: email.trim() });
          }
        } catch (_e) { /* tracking is best-effort */ }

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
  const isForbiddenDomain = !creator && !offline && websiteDomain && FORBIDDEN_DOMAINS.includes(websiteDomain);

  return (
    <AuthSplitShell
      eyebrow="Create account"
      title="Create your account"
      description={creator
        ? "Register as a creator to start running engagement ads."
        : offline
          ? "Register your offline business — we'll verify your CAC document next."
          : "Register with your business email to start tracking."}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary transition-colors hover:text-primary/80">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSignup} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="subtype" className="text-sm text-foreground">I am a *</Label>
          <Select value={subtype} onValueChange={(v) => setSubtype(v as Subtype)}>
            <SelectTrigger id="subtype" className="h-11 rounded-lg border-border bg-background px-4">
              <SelectValue placeholder="Select what best describes you" />
            </SelectTrigger>
            <SelectContent>
              {SUBTYPE_OPTIONS.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subtype && (
            <p className="text-[10px] leading-none text-muted-foreground">
              {creator
                ? "You'll run Engagement Ads. No business website required."
                : offline
                  ? "You'll run Offline Ads. You'll upload your CAC/business document after signup."
                  : "You'll run Performance & Commerce Ads. Business website required."}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="full-name" className="text-sm text-foreground">Full Name *</Label>
            <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} required autoComplete="name" className="h-11 rounded-lg border-border bg-background px-4" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-name" className="text-sm text-foreground">
              {creator ? "Stage / Channel Name" : "Company"}
            </Label>
            <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={100} autoComplete="organization" className="h-11 rounded-lg border-border bg-background px-4" />
          </div>
        </div>

        {!creator && !offline && (
          <div className="space-y-1.5">
            <Label htmlFor="website" className="text-sm text-foreground">Website *</Label>
            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={255} placeholder="yourbusiness.com" autoComplete="url" required={!creator && !offline} className="h-11 rounded-lg border-border bg-background px-4" />
            {isForbiddenDomain ? (
              <p className="text-[10px] leading-none text-destructive">Email provider domains are not accepted.</p>
            ) : websiteDomain ? (
              <p className="text-[10px] leading-none text-muted-foreground">Your email must end with @{websiteDomain}</p>
            ) : null}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm text-foreground">
            {creator || offline ? "Email *" : "Business Email *"}
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
            required
            autoComplete="email"
            placeholder={
              creator || offline
                ? "you@gmail.com"
                : websiteDomain && !isForbiddenDomain
                  ? `you@${websiteDomain}`
                  : "you@yourbusiness.com"
            }
            className="h-11 rounded-lg border-border bg-background px-4"
          />
          {(creator || offline) && (
            <p className="text-[10px] leading-none text-muted-foreground">
              Any email works (corporate or personal).
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm text-foreground">Password *</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} required autoComplete="new-password" className="h-11 rounded-lg border-border bg-background px-4" />
          <p className="text-[10px] leading-none text-muted-foreground">Minimum 8 characters</p>
        </div>

        <label className="mt-1 flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-xs leading-snug text-muted-foreground">
            I agree to the Karbali Ads{" "}
            <Link to="/terms" target="_blank" className="font-medium text-primary hover:underline">Terms & Conditions</Link>
            {" "}and understand that promoting scam, fraud, or prohibited content results in a permanent ban and forfeiture of my wallet balance.
          </span>
        </label>

        <GlassButton type="submit" className="mt-2 h-11 w-full rounded-lg" variant="glow" disabled={loading || !!isForbiddenDomain || !acceptedTerms}>
          {loading ? "Creating account..." : "Create Account"}
        </GlassButton>
      </form>
    </AuthSplitShell>
  );
}
