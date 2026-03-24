import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Docs() {
  const baseUrl = `https://dvkoafztquswcqniwcyf.supabase.co/functions/v1`;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Documentation</h1>
          <p className="text-muted-foreground">Integrate Karbali tracking into your application</p>
        </div>

        <Card>
          <CardHeader><CardTitle>1. Authentication</CardTitle></CardHeader>
          <CardContent className="prose prose-sm max-w-none text-foreground">
            <p>Every request must include your campaign <strong>API key</strong>. You can find it on your campaign detail page.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Track Events</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">Send user actions to the Karbali tracking endpoint.</p>
            <div className="rounded bg-muted p-4">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">POST {baseUrl}/track</p>
              <pre className="text-sm">{`{
  "api_key": "kb_your_api_key",
  "event_type": "download" | "signup" | "purchase",
  "user_id": "your_internal_user_id",
  "referral_id": "ref_abc123",  // from cookie
  "amount": 49.99              // required for purchase
}`}</pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>3. Verify Integration</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">Send a test event to verify your setup before going live.</p>
            <div className="rounded bg-muted p-4">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">POST {baseUrl}/track</p>
              <pre className="text-sm">{`{
  "api_key": "kb_your_api_key",
  "event_type": "download",
  "user_id": "test_user_001",
  "referral_id": null
}`}</pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>4. Referral ID Handling</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>When a user clicks a referral link, the <code className="rounded bg-muted px-1.5 py-0.5">referral_id</code> is embedded in the URL.</p>
            <p>Store it in a cookie or local storage, then include it in all event tracking calls.</p>
            <div className="rounded bg-muted p-4">
              <pre className="text-sm">{`// Extract referral_id from URL
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>5. JavaScript SDK (Optional)</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded bg-muted p-4">
              <pre className="text-sm">{`<script>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>6. Event Types & Billing</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2">Event</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Billing</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b"><td className="py-2">download</td><td>App download / first visit</td><td>Charged if no signup/purchase yet</td></tr>
                <tr className="border-b"><td className="py-2">signup</td><td>User registration</td><td>Charged if no purchase yet</td></tr>
                <tr><td className="py-2">purchase</td><td>Completed purchase</td><td>Final milestone charge</td></tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
