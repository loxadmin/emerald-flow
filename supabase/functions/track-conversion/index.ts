import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Server-side conversion tracking endpoint.
 * Called by advertiser backends after confirmed signup/purchase events.
 * This is the DETERMINISTIC path — no guessing, no pattern matching.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const apiKey = String(body.api_key || "").trim();
    const eventType = String(body.event_type || body.event || "").trim();
    const clientId = String(body.client_id || body.tid || "").trim();
    const userId = String(body.user_id || "").trim();
    const amount = body.amount != null ? Number(body.amount) : null;

    if (!apiKey || !eventType) {
      return new Response(
        JSON.stringify({ error: "Missing api_key and event_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!clientId && !userId) {
      return new Response(
        JSON.stringify({ error: "Missing client_id or user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validEvents = ["signup", "purchase", "download"];
    if (!validEvents.includes(eventType)) {
      return new Response(
        JSON.stringify({ error: "Invalid event_type. Must be: signup, purchase, or download" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API key
    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("campaign_id")
      .eq("key", apiKey)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const campaignId = keyData.campaign_id;

    // Look up referral from users_tracking
    const identities = [clientId, userId].filter(Boolean);
    let referralId: string | null = null;

    if (identities.length > 0) {
      const { data: tracked } = await supabase
        .from("users_tracking")
        .select("referral_id")
        .eq("campaign_id", campaignId)
        .in("external_user_id", identities);

      for (const t of tracked || []) {
        if (t.referral_id) {
          referralId = t.referral_id;
          break;
        }
      }
    }

    // Forward to the main track function via internal call
    const trackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/track`;
    const trackResponse = await fetch(trackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        api_key: apiKey,
        event_type: eventType,
        user_id: userId || null,
        client_id: clientId || null,
        referral_id: referralId || body.referral_id || null,
        amount: amount,
        source_url: body.source_url || "server-side",
      }),
    });

    const result = await trackResponse.json().catch(() => ({}));

    return new Response(
      JSON.stringify(result),
      { status: trackResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
