import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const body = await req.json();
    const { action, campaign_id, api_key, code } = body;

    if (action === "create_api_key") {
      const { error } = await supabase
        .from("api_keys")
        .insert({ campaign_id, key: api_key });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_referral") {
      // Get campaign's first source URL as redirect
      const { data: sources } = await supabase
        .from("campaign_sources")
        .select("url")
        .eq("campaign_id", campaign_id)
        .limit(1);

      const redirect_url = sources?.[0]?.url || null;

      const { error } = await supabase
        .from("referrals")
        .insert({ campaign_id, code, redirect_url });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, code }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
