import DashboardLayout from "@/components/DashboardLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import MotionWrapper from "@/components/MotionWrapper";

export default function Docs() {
  const baseUrl = "https://advertiser.karbali.com/api";

  return (
    <DashboardLayout>
      <MotionWrapper className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">API Documentation</h1>
          <p className="text-sm text-muted-foreground">Integrate Karbali tracking into your application</p>
        </div>

        <GlassCard variant="strong">
          <GlassCardHeader><GlassCardTitle>Base URL</GlassCardTitle></GlassCardHeader>
          <GlassCardContent>
            <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
              <code className="text-sm text-primary/80 break-all">{baseUrl}</code>
            </div>
            <p className="text-sm text-muted-foreground mt-3">All API requests should be made to this base URL. The Karbali platform handles routing and load balancing internally.</p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="strong">
          <GlassCardHeader><GlassCardTitle>1. Authentication</GlassCardTitle></GlassCardHeader>
          <GlassCardContent>
            <p className="text-sm text-muted-foreground">Every request must include your campaign <strong className="text-foreground/80">API key</strong>. You can find it on your campaign detail page.</p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="strong">
          <GlassCardHeader><GlassCardTitle>2. Track Events</GlassCardTitle></GlassCardHeader>
          <GlassCardContent>
            <p className="mb-4 text-sm text-muted-foreground">Send user actions to the Karbali tracking endpoint.</p>
            <div className="rounded-xl bg-muted/30 border border-border/50 p-4 overflow-x-auto">
              <p className="mb-1 text-xs font-semibold text-muted-foreground/60">POST {baseUrl}/track</p>
              <pre className="text-sm text-foreground/60 whitespace-pre-wrap">{`{
  "api_key": "kb_your_api_key",
  "event_type": "download" | "signup" | "purchase",
  "user_id": "your_internal_user_id",
  "referral_id": "ref_abc123",
  "amount": 49.99
}`}</pre>
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="strong">
          <GlassCardHeader><GlassCardTitle>3. Response Format</GlassCardTitle></GlassCardHeader>
          <GlassCardContent>
            <div className="rounded-xl bg-muted/30 border border-border/50 p-4 overflow-x-auto">
              <p className="mb-1 text-xs font-semibold text-muted-foreground/60">Success Response (200)</p>
              <pre className="text-sm text-foreground/60 whitespace-pre-wrap">{`{
  "success": true,
  "event_id": "uuid",
  "charged": 2.00
}`}</pre>
            </div>
            <div className="rounded-xl bg-muted/30 border border-border/50 p-4 mt-3 overflow-x-auto">
              <p className="mb-1 text-xs font-semibold text-muted-foreground/60">Error Response (4xx/5xx)</p>
              <pre className="text-sm text-foreground/60 whitespace-pre-wrap">{`{
  "error": "Description of the error"
}`}</pre>
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="strong">
          <GlassCardHeader><GlassCardTitle>4. Referral ID Handling</GlassCardTitle></GlassCardHeader>
          <GlassCardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">When a user clicks a referral link, the <code className="rounded-lg bg-muted/50 px-1.5 py-0.5 text-primary/80">referral_id</code> is embedded in the URL.</p>
            <p className="text-sm text-muted-foreground">Store it in a cookie or local storage, then include it in all event tracking calls.</p>
            <div className="rounded-xl bg-muted/30 border border-border/50 p-4 overflow-x-auto">
              <pre className="text-sm text-foreground/60 whitespace-pre-wrap">{`// Extract referral_id from URL
const params = new URLSearchParams(window.location.search);
const refId = params.get("ref");
if (refId) {
  document.cookie = "karbali_ref=" + refId + ";path=/;max-age=2592000";
}

// Read it later
function getRefId() {
  const match = document.cookie.match(/karbali_ref=([^;]+)/);
  return match ? match[1] : null;
}`}</pre>
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="strong">
          <GlassCardHeader><GlassCardTitle>5. JavaScript SDK (Optional)</GlassCardTitle></GlassCardHeader>
          <GlassCardContent>
            <div className="rounded-xl bg-muted/30 border border-border/50 p-4 overflow-x-auto">
              <pre className="text-sm text-foreground/60 whitespace-pre-wrap">{`<script>
window.Karbali = {
  apiKey: "kb_your_api_key",
  track: function(event, data) {
    fetch("${baseUrl}/track", {
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
Karbali.track("signup", {
  user_id: "user_123",
  referral_id: getRefId()
});
</script>`}</pre>
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="strong">
          <GlassCardHeader><GlassCardTitle>6. Event Types and Billing</GlassCardTitle></GlassCardHeader>
          <GlassCardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left">
                    <th className="pb-3 text-muted-foreground">Event</th>
                    <th className="pb-3 text-muted-foreground">Description</th>
                    <th className="pb-3 text-muted-foreground">Billing</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/30"><td className="py-3 text-primary/80">download</td><td>App download / first visit</td><td>Charged if no signup/purchase yet</td></tr>
                  <tr className="border-b border-border/30"><td className="py-3 text-primary/80">signup</td><td>User registration</td><td>Charged if no purchase yet</td></tr>
                  <tr><td className="py-3 text-primary/80">purchase</td><td>Completed purchase</td><td>Final milestone charge</td></tr>
                </tbody>
              </table>
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="strong">
          <GlassCardHeader><GlassCardTitle>7. Rate Limits</GlassCardTitle></GlassCardHeader>
          <GlassCardContent>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Maximum 10 events per IP per minute per campaign</li>
              <li>Duplicate events (same user + event type) within 5 seconds are rejected</li>
              <li>Invalid API keys return 401 Unauthorized</li>
              <li>Inactive campaigns return 403 Forbidden</li>
            </ul>
          </GlassCardContent>
        </GlassCard>
      </MotionWrapper>
    </DashboardLayout>
  );
}
