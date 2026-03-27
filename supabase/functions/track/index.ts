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
    const { api_key, event_type, user_id, referral_id, amount } = body;

    // Input validation
    if (!api_key || !event_type || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: api_key, event_type, user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["download", "signup", "purchase"].includes(event_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid event_type. Must be: download, signup, purchase" }),
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

    const campaign_id = keyData.campaign_id;

    // Get campaign
    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campError || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (campaign.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Campaign is not active" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic fraud detection: rate limiting by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("x-real-ip") || "unknown";

    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentEvents } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .eq("ip", ip)
      .gte("created_at", oneMinuteAgo);

    if ((recentEvents || 0) > 10) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Duplicate check: same user + same event type within 5 seconds
    const fiveSecsAgo = new Date(Date.now() - 5000).toISOString();
    const { count: dupeCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .eq("external_user_id", user_id)
      .eq("event_type", event_type)
      .gte("created_at", fiveSecsAgo);

    if ((dupeCount || 0) > 0) {
      return new Response(
        JSON.stringify({ error: "Duplicate event detected" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Attribution: check if user exists
    const { data: existingUser } = await supabase
      .from("users_tracking")
      .select("id")
      .eq("campaign_id", campaign_id)
      .eq("external_user_id", user_id)
      .maybeSingle();

    if (!existingUser) {
      await supabase.from("users_tracking").insert({
        external_user_id: user_id,
        campaign_id,
        referral_id: referral_id || null,
      });
    }

    // Save event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        campaign_id,
        external_user_id: user_id,
        event_type,
        amount: amount || null,
        referral_id: referral_id || null,
        ip,
      })
      .select("id")
      .single();

    if (eventError) throw eventError;

    // Billing engine - milestone logic
    let chargeAmount = 0;

    // Check user's event history for milestone billing
    const { data: userEvents } = await supabase
      .from("events")
      .select("id, event_type")
      .eq("campaign_id", campaign_id)
      .eq("external_user_id", user_id);

    const hasPurchase = userEvents?.some((e) => e.event_type === "purchase" && e.id !== event.id);
    const hasSignup = userEvents?.some((e) => e.event_type === "signup" && e.id !== event.id);

    if (event_type === "purchase") {
      chargeAmount = Number(campaign.price_purchase);
    } else if (event_type === "signup" && !hasPurchase) {
      chargeAmount = Number(campaign.price_signup);
    } else if (event_type === "download" && !hasSignup && !hasPurchase) {
      chargeAmount = Number(campaign.price_download);
    }

    if (chargeAmount > 0 && Number(campaign.budget_remaining) >= chargeAmount) {
      await supabase.from("transactions").insert({
        campaign_id,
        event_id: event.id,
        amount: chargeAmount,
        description: `${event_type} event charge`,
      });

      const newBudget = Number(campaign.budget_remaining) - chargeAmount;
      const updateData: Record<string, unknown> = { budget_remaining: newBudget };
      
      if (newBudget <= 0) {
        updateData.status = "rejected";
      }

      await supabase.from("campaigns").update(updateData).eq("id", campaign_id);
    }

    return new Response(
      JSON.stringify({ success: true, event_id: event.id, charged: chargeAmount }),
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
