import { Link } from "react-router-dom";
import FluidCanvas from "@/components/FluidCanvas";
import Logo from "@/components/Logo";
import MotionWrapper from "@/components/MotionWrapper";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Docs() {
  const trackUrl = "https://dvkoafztquswcqniwcyf.supabase.co/functions/v1/track";

  return (
    <div className="relative min-h-screen bg-background">
      <FluidCanvas />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <MotionWrapper>
          <div className="flex items-center gap-3 mb-8">
            <Link to="/">
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Home</Button>
            </Link>
            <Logo size={24} />
            <span className="text-lg font-semibold text-gradient">Karbali API Docs</span>
          </div>
        </MotionWrapper>

        <div className="space-y-6">
          <MotionWrapper delay={0.05}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">Base URL</h2>
              <code className="block rounded-lg bg-muted px-4 py-2.5 text-sm text-primary break-all">{trackUrl}</code>
              <p className="text-sm text-muted-foreground mt-3">All tracking API requests are sent to this endpoint.</p>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.08}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">1. Authentication</h2>
              <p className="text-sm text-muted-foreground">Every request must include your campaign <strong className="text-foreground">API key</strong> in the request body. Generate one when creating a campaign.</p>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.1}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">2. Track Events</h2>
              <p className="text-sm text-muted-foreground mb-3">Send user actions to the tracking endpoint.</p>
              <div className="rounded-lg bg-muted p-4 overflow-x-auto">
                <p className="text-xs font-semibold text-muted-foreground mb-2">POST {trackUrl}</p>
                <pre className="text-sm text-foreground/70 whitespace-pre-wrap">{`{
  "api_key": "kb_your_api_key",
  "event_type": "download" | "signup" | "purchase",
  "user_id": "your_internal_user_id",
  "referral_id": "ref_abc123",
  "amount": 49.99
}`}</pre>
              </div>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.12}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">3. Response Format</h2>
              <div className="space-y-3">
                <div className="rounded-lg bg-muted p-4 overflow-x-auto">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Success (200)</p>
                  <pre className="text-sm text-foreground/70 whitespace-pre-wrap">{`{ "success": true, "event_id": "uuid", "charged": 2.00 }`}</pre>
                </div>
                <div className="rounded-lg bg-muted p-4 overflow-x-auto">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Error (4xx/5xx)</p>
                  <pre className="text-sm text-foreground/70 whitespace-pre-wrap">{`{ "error": "Description of the error" }`}</pre>
                </div>
              </div>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.14}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">4. Referral ID Handling</h2>
              <p className="text-sm text-muted-foreground mb-3">When a user clicks a referral link, the <code className="text-primary bg-muted px-1.5 py-0.5 rounded">referral_id</code> is in the URL. Store it in a cookie and include in all tracking calls.</p>
              <div className="rounded-lg bg-muted p-4 overflow-x-auto">
                <pre className="text-sm text-foreground/70 whitespace-pre-wrap">{`const params = new URLSearchParams(window.location.search);
const refId = params.get("ref");
if (refId) document.cookie = "karbali_ref=" + refId + ";path=/;max-age=2592000";

function getRefId() {
  const m = document.cookie.match(/karbali_ref=([^;]+)/);
  return m ? m[1] : null;
}`}</pre>
              </div>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.16}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">5. JavaScript SDK</h2>
              <div className="rounded-lg bg-muted p-4 overflow-x-auto">
                <pre className="text-sm text-foreground/70 whitespace-pre-wrap">{`<script>
window.Karbali = {
  apiKey: "kb_your_api_key",
  track: function(event, data) {
    fetch("${trackUrl}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        event_type: event,
        user_id: data.user_id,
        referral_id: data.referral_id || null,
        amount: data.amount || null
      })
    });
  }
};

// Usage
Karbali.track("signup", { user_id: "user_123", referral_id: getRefId() });
</script>`}</pre>
              </div>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.18}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">6. Event Types & Billing</h2>
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
                    <tr className="border-b border-border/50"><td className="py-2 text-primary">download</td><td>App download / first visit</td><td>Charged if no signup/purchase yet</td></tr>
                    <tr className="border-b border-border/50"><td className="py-2 text-primary">signup</td><td>User registration</td><td>Charged if no purchase yet</td></tr>
                    <tr><td className="py-2 text-primary">purchase</td><td>Completed purchase</td><td>Final milestone charge</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </MotionWrapper>

          <MotionWrapper delay={0.2}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground mb-2">7. Rate Limits</h2>
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
