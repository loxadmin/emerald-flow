import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/glass-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { getStoredAffiliateRef } from "@/components/AffiliateRefCapture";

const PERKS = [
  { title: "$50 welcome bonus", body: "Credited the moment you register as an affiliate." },
  { title: "$50 per advertiser", body: "Every advertiser you refer who goes live earns you another $50." },
  { title: "5% of first deposit", body: "You also earn 5% of whatever that advertiser first funds their wallet with." },
];

export default function Affiliates() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      if (!active) return;
      setUserId(uid);
      if (uid) {
        const { data: aff } = await supabase.from("affiliates").select("id").eq("user_id", uid).maybeSingle();
        if (aff && active) {
          navigate("/affiliate/dashboard", { replace: true });
          return;
        }
      }
      setChecking(false);
    })();
    return () => { active = false; };
  }, [navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast.error("Enter your full name"); return; }
    setLoading(true);
    try {
      if (userId) {
        const { error } = await supabase.rpc("register_affiliate", {
          _full_name: fullName.trim(),
          _phone: phone.trim() || null,
        });
        if (error) throw error;
        toast.success("Affiliate account created. Your $50 bonus is credited.");
        navigate("/affiliate/dashboard");
        return;
      }

      if (!email.trim() || password.length < 8) {
        toast.error("Enter a valid email and a password of at least 8 characters");
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            is_affiliate: true,
            affiliate_phone: phone.trim(),
            affiliate_ref: getStoredAffiliateRef() || undefined,
          },
          emailRedirectTo: `${window.location.origin}/affiliates`,
        },
      });
      if (error) throw error;
      toast.success("Account created. Verify your email, then log in to claim your $50 bonus.");
      navigate("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link to="/" className="flex items-center gap-2">
          <Logo size={22} />
          <span className="text-base font-bold text-gradient">Karbali Ads</span>
        </Link>
        <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">Log in</Link>
      </header>

      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-10 sm:px-10 lg:grid-cols-2 lg:py-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Affiliate program</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
            Earn for every advertiser you bring to Karbali
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Share your affiliate link. When an advertiser signs up through it, funds their wallet and
            gets a campaign approved and live, you get paid. No codes to type, we track it automatically.
          </p>

          <div className="mt-8 space-y-4">
            {PERKS.map((p) => (
              <div key={p.title} className="rounded-xl border border-border bg-card p-4">
                <p className="font-semibold">{p.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">The 30-day rule</p>
            <p className="mt-1">
              Your $50 welcome bonus is locked until your first qualified referral. If you do not refer a
              paying advertiser within 30 days of registering, your affiliate account is closed permanently.
            </p>
            <p className="mt-2">
              A referred advertiser must fund their wallet and have a campaign, ad package or switch offer
              approved and live within 30 days of registering for it to count.
            </p>
          </div>
        </div>

        <div className="lg:sticky lg:top-10 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Become an affiliate</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {userId ? "Confirm your details to activate your affiliate account." : "Register and verify your email to get started."}
            </p>
            {checking ? (
              <div className="mt-6 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <form onSubmit={handleRegister} className="mt-5 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="aff-name" className="text-sm">Full name *</Label>
                  <Input id="aff-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} required className="h-11 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aff-phone" className="text-sm">Phone</Label>
                  <Input id="aff-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} className="h-11 rounded-lg" />
                </div>
                {!userId && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="aff-email" className="text-sm">Email *</Label>
                      <Input id="aff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required autoComplete="email" className="h-11 rounded-lg" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="aff-password" className="text-sm">Password *</Label>
                      <Input id="aff-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} required autoComplete="new-password" className="h-11 rounded-lg" />
                      <p className="text-[10px] text-muted-foreground">Minimum 8 characters</p>
                    </div>
                  </>
                )}
                <GlassButton type="submit" variant="glow" className="h-11 w-full rounded-lg" disabled={loading}>
                  {loading ? "Please wait..." : userId ? "Activate affiliate account" : "Become an affiliate"}
                </GlassButton>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
