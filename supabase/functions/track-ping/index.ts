import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { api_key, domain, timestamp } = await req.json();

    if (!api_key || !domain) {
      return json({ error: "Missing api_key or domain" }, 400);
    }

    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("campaign_id")
      .eq("key", api_key)
      .single();

    if (keyError || !keyData) {
      return json({ error: "Invalid API key" }, 401);
    }

    const campaignId = keyData.campaign_id;
    const pingAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    const { data: existing } = await supabase
      .from("campaign_script_health")
      .select("campaign_id, last_ping_at, status")
      .eq("campaign_id", campaignId)
      .maybeSingle();

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const stale = !!existing?.last_ping_at && existing.last_ping_at < fiveMinutesAgo;

    const status = stale ? "under_review" : "healthy";
    const flaggedReason = stale
      ? "Tracker heartbeat recovered after inactivity > 5 minutes. Review possible uninstall/tampering."
      : null;

    await supabase
      .from("campaign_script_health")
      .upsert({
        campaign_id: campaignId,
        domain,
        last_ping_at: pingAt,
        status,
        flagged_reason: flaggedReason,
        flagged_at: stale ? pingAt : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "campaign_id" });

    return json({ ok: true, status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
