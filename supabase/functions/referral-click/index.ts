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

    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing referral code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up referral
    const { data: referral, error } = await supabase
      .from("referrals")
      .select("id, campaign_id, redirect_url, code")
      .eq("code", code)
      .single();

    if (error || !referral) {
      return new Response(
        JSON.stringify({ error: "Referral not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log click
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const user_agent = req.headers.get("user-agent") || "unknown";

    await supabase.from("clicks").insert({
      referral_id: referral.id,
      ip,
      user_agent,
    });

    // Get redirect URL - from referral or campaign's first source
    let redirect_url = referral.redirect_url;
    if (!redirect_url) {
      const { data: sources } = await supabase
        .from("campaign_sources")
        .select("url")
        .eq("campaign_id", referral.campaign_id)
        .limit(1);
      redirect_url = sources?.[0]?.url || null;
    }

    return new Response(
      JSON.stringify({ redirect_url, referral_id: referral.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
