import { Link } from "react-router-dom";
import FluidCanvas from "@/components/FluidCanvas";
import Logo from "@/components/Logo";
import MotionWrapper from "@/components/MotionWrapper";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export default function Docs() {
  const { session } = useAuth();
  const brandedBaseUrl = "https://advertiser.karbali.com";
  const referralUrl = `${brandedBaseUrl}/r/ref_xxxxxxxx`;
  const trackerScriptUrl = `${brandedBaseUrl}/karbali-tracker.js`;
  const trackUrl = `${brandedBaseUrl}/api/track`;

  return (
    <div className="relative min-h-screen bg-background">
      <FluidCanvas />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <MotionWrapper>
          <div className="flex items-center gap-3 mb-8">
            <Link to={session ? "/dashboard" : "/"}>
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> {session ? "Back to Dashboard" : "Back to Home"}</Button>
            </Link>
            <Logo size={24} />
            <span className="text-lg font-semibold text-gradient">Karbali API Docs</span>
          </div>
        </MotionWrapper>

        <div className="space-y-6">
          <MotionWrapper delay={0.05}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">Karbali Endpoints</h2>
              <div className="space-y-2 text-sm">
                <code className="block rounded-lg bg-muted px-4 py-2.5 text-primary break-all">{trackerScriptUrl}</code>
                <code className="block rounded-lg bg-muted px-4 py-2.5 text-primary break-all">{trackUrl}</code>
                <code className="block rounded-lg bg-muted px-4 py-2.5 text-primary break-all">{referralUrl}</code>
              </div>
              <p className="text-sm text-muted-foreground mt-3">Advertisers install the Karbali loader script, receive branded referral links, and the loader handles client IDs plus event delivery for them.</p>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.08}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">1. Generate your campaign key</h2>
              <p className="text-sm text-muted-foreground">Create a campaign, pick the verified website for that campaign, generate the API key, and copy the dashboard-provided install snippet.</p>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.1}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">2. Install the Karbali loader</h2>
              <div className="rounded-lg bg-muted p-4 overflow-x-auto">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Install snippet</p>
                <pre className="text-sm text-foreground/70 whitespace-pre-wrap">{`<script>
  window.KarbaliConfig = { apiKey: "kb_your_api_key" };
</script>
<script async src="${trackerScriptUrl}" data-api-key="kb_your_api_key"></script>`}</pre>
              </div>
              <p className="text-sm text-muted-foreground mt-3">The loader stores the referral ID and a Karbali client ID on the advertiser domain so downloads, signups, and purchases stay tied to the same visitor journey.</p>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.12}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">3. Send lifecycle events</h2>
              <p className="text-sm text-muted-foreground mb-3">Trigger Karbali when the referral visitor downloads, signs up, or completes a paid conversion.</p>
              <div className="rounded-lg bg-muted p-4 overflow-x-auto">
                <pre className="text-sm text-foreground/70 whitespace-pre-wrap">{`window.Karbali.track("download", {});
window.Karbali.track("signup", { user_id: "user_123" });
window.Karbali.track("purchase", {
  user_id: "user_123",
  amount: 49.99
});`}</pre>
              </div>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.14}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">4. Referral link flow</h2>
              <p className="text-sm text-muted-foreground mb-3">Admins generate branded referral links. When a visitor lands through that link, Karbali appends the referral ID and client ID to the advertiser URL and the loader stores both automatically.</p>
              <div className="rounded-lg bg-muted p-4 overflow-x-auto">
                <pre className="text-sm text-foreground/70 whitespace-pre-wrap">{`${referralUrl}
→ redirects to advertiser website with
?ref=<referral_id>&ref_code=<referral_code>&client_id=<karbali_client_id>`}</pre>
              </div>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.16}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">5. Verification</h2>
              <p className="text-sm text-muted-foreground mb-3">Verification no longer trusts the API key alone. Karbali fetches the selected verified website and checks for your loader script plus the campaign API key before marking the integration as live.</p>
              <div className="rounded-lg bg-muted p-4 overflow-x-auto">
                <pre className="text-sm text-foreground/70 whitespace-pre-wrap">{`{ "verified": true, "domain": "example.com" }
{ "verified": false, "error": "We couldn't detect the Karbali loader or API key on your domain yet." }`}</pre>
              </div>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.18}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">6. Direct event payload</h2>
              <div className="rounded-lg bg-muted p-4 overflow-x-auto">
                <p className="text-xs font-semibold text-muted-foreground mb-2">POST {trackUrl}</p>
                <pre className="text-sm text-foreground/70 whitespace-pre-wrap">{`{
  "api_key": "kb_your_api_key",
  "event_type": "download" | "signup" | "purchase",
  "user_id": "your_internal_user_id",
  "client_id": "karbali_client_id",
  "referral_id": "referral_uuid_or_code",
  "amount": 49.99
}`}</pre>
              </div>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.2}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">7. Event Types & Billing</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 text-muted-foreground font-medium">Event</th>
                      <th className="pb-2 text-muted-foreground font-medium">Description</th>
                      <th className="pb-2 text-muted-foreground font-medium">Billing</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/50"><td className="py-2 text-primary">download</td><td>Mobile app install / first referral conversion</td><td>Charged using the campaign's download price</td></tr>
                    <tr className="border-b border-border/50"><td className="py-2 text-primary">signup</td><td>Account creation on any platform</td><td>Charged using the campaign's signup price</td></tr>
                    <tr><td className="py-2 text-primary">purchase</td><td>Sale / paid subscription</td><td>$1 flat fee plus 10% of the tracked sale amount</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.22}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">8. Response Format</h2>
              <div className="space-y-3">
                <div className="rounded-lg bg-muted p-4 overflow-x-auto">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Success (200)</p>
                  <pre className="text-sm text-foreground/70 whitespace-pre-wrap">{`{ "success": true, "event_id": "uuid", "charged": 2.00, "referral_id": "uuid" }`}</pre>
                </div>
                <div className="rounded-lg bg-muted p-4 overflow-x-auto">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Error (4xx/5xx)</p>
                  <pre className="text-sm text-foreground/70 whitespace-pre-wrap">{`{ "error": "Description of the error" }`}</pre>
                </div>
              </div>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.24}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">9. Rate Limits</h2>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Maximum 10 events per IP per minute per campaign</li>
                <li>Duplicate events (same user + event type) within 5 seconds are rejected</li>
                <li>Invalid API keys return 401 Unauthorized</li>
                <li>Inactive campaigns return 403 Forbidden</li>
              </ul>
            </div>
          </MotionWrapper>
        </div>
      </div>
    </div>
  );
}
