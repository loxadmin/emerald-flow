import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      return new Response(
        JSON.stringify({ error: "Missing api_key or domain" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API key
    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("campaign_id")
      .eq("key", api_key)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update campaign's last ping timestamp via admin_settings or a dedicated field
    // For now, store in admin_settings as a simple key-value
    const pingKey = `ping_${keyData.campaign_id}`;
    const { data: existing } = await supabase
      .from("admin_settings")
      .select("id")
      .eq("key", pingKey)
      .maybeSingle();

    const pingValue = JSON.stringify({ domain, timestamp: timestamp || new Date().toISOString() });

    if (existing) {
      await supabase
        .from("admin_settings")
        .update({ value: pingValue, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("admin_settings")
        .insert({
          key: pingKey,
          value: pingValue,
          description: `Last script ping for campaign ${keyData.campaign_id}`,
        });
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
