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

    const { code, client_id } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing referral code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    await supabase.from("clicks").insert({
      referral_id: referral.id,
      ip,
      user_agent: userAgent,
    });

    const clientId = String(client_id || "").trim();
    if (clientId) {
      const { data: trackedUser } = await supabase
        .from("users_tracking")
        .select("id, referral_id")
        .eq("campaign_id", referral.campaign_id)
        .eq("external_user_id", clientId)
        .maybeSingle();

      if (!trackedUser) {
        await supabase.from("users_tracking").insert({
          campaign_id: referral.campaign_id,
          external_user_id: clientId,
          referral_id: referral.id,
        });
      } else if (!trackedUser.referral_id) {
        await supabase
          .from("users_tracking")
          .update({ referral_id: referral.id })
          .eq("id", trackedUser.id);
      }
    }

    let redirectUrl = referral.redirect_url;
    if (!redirectUrl) {
      const { data: sources } = await supabase
        .from("campaign_sources")
        .select("url")
        .eq("campaign_id", referral.campaign_id)
        .limit(1);
      redirectUrl = sources?.[0]?.url || null;
    }

    return new Response(
      JSON.stringify({ redirect_url: redirectUrl, referral_id: referral.id, client_id: clientId || null }),
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
