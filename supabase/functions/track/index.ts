import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SALE_FLAT_FEE = 1;
const SALE_COMMISSION_RATE = 0.1;

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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
    const { api_key, event_type, user_id, client_id, referral_id, amount } = body;
    const resolvedIdentity = String(user_id || client_id || "").trim();

    // Input validation
    if (!api_key || !event_type || !resolvedIdentity) {
      return jsonResponse({ error: "Missing required fields: api_key, event_type, and user_id or client_id" }, 400);
    }

    if (!["download", "signup", "purchase"].includes(event_type)) {
      return jsonResponse({ error: "Invalid event_type. Must be: download, signup, purchase" }, 400);
    }

    if (event_type === "purchase" && amount !== null && amount !== undefined && Number(amount) < 0) {
      return jsonResponse({ error: "Purchase amount must be zero or greater" }, 400);
    }

    // Validate API key
    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("campaign_id")
      .eq("key", api_key)
      .single();

    if (keyError || !keyData) {
      return jsonResponse({ error: "Invalid API key" }, 401);
    }

    const campaign_id = keyData.campaign_id;

    // Get campaign
    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campError || !campaign) {
      return jsonResponse({ error: "Campaign not found" }, 404);
    }

    if (campaign.status !== "active") {
      return jsonResponse({ error: "Campaign is not active" }, 403);
    }

    if (Array.isArray(campaign.selected_milestones) && campaign.selected_milestones.length > 0 && !campaign.selected_milestones.includes(event_type)) {
      return jsonResponse({ error: `This campaign is not configured for ${event_type} tracking` }, 403);
    }

    let resolvedReferralId: string | null = null;
    if (referral_id) {
      const referralValue = String(referral_id).trim();
      const referralQuery = supabase
        .from("referrals")
        .select("id, campaign_id")
        [isUuid(referralValue) ? "eq" : "eq"](isUuid(referralValue) ? "id" : "code", referralValue)
        .maybeSingle();

      const { data: referral } = await referralQuery;
      if (!referral || referral.campaign_id !== campaign_id) {
        return jsonResponse({ error: "Referral does not belong to this campaign" }, 400);
      }
      resolvedReferralId = referral.id;
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
      return jsonResponse({ error: "Rate limit exceeded" }, 429);
    }

    // Duplicate check: same user + same event type within 5 seconds
    const fiveSecsAgo = new Date(Date.now() - 5000).toISOString();
    const { count: dupeCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .eq("external_user_id", resolvedIdentity)
      .eq("event_type", event_type)
      .gte("created_at", fiveSecsAgo);

    if ((dupeCount || 0) > 0) {
      return jsonResponse({ error: "Duplicate event detected" }, 409);
    }

    // Attribution: check if user exists
    const { data: existingUser } = await supabase
      .from("users_tracking")
      .select("id, referral_id")
      .eq("campaign_id", campaign_id)
      .eq("external_user_id", resolvedIdentity)
      .maybeSingle();

    if (!existingUser) {
      await supabase.from("users_tracking").insert({
        external_user_id: resolvedIdentity,
        campaign_id,
        referral_id: resolvedReferralId,
      });
    } else if (!existingUser.referral_id && resolvedReferralId) {
      await supabase
        .from("users_tracking")
        .update({ referral_id: resolvedReferralId })
        .eq("id", existingUser.id);
    }

    // Save event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        campaign_id,
        external_user_id: resolvedIdentity,
        event_type,
        amount: amount ?? null,
        referral_id: resolvedReferralId,
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
      .eq("external_user_id", resolvedIdentity);

    const hasPurchase = userEvents?.some((e) => e.event_type === "purchase" && e.id !== event.id);
    const hasSignup = userEvents?.some((e) => e.event_type === "signup" && e.id !== event.id);

    if (event_type === "purchase") {
      const saleAmount = Number(amount || 0);
      chargeAmount = Number(campaign.price_purchase || SALE_FLAT_FEE) + saleAmount * SALE_COMMISSION_RATE;
    } else if (event_type === "signup" && !hasPurchase) {
      chargeAmount = Number(campaign.price_signup);
    } else if (event_type === "download" && !hasSignup && !hasPurchase) {
      chargeAmount = Number(campaign.price_download);
    }

    if (chargeAmount > 0 && Number(campaign.budget_remaining) < chargeAmount) {
      await supabase.from("campaigns").update({ status: "rejected" }).eq("id", campaign_id);
      return jsonResponse({ error: "Campaign budget is exhausted" }, 402);
    }

    if (chargeAmount > 0) {
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

    return jsonResponse({ success: true, event_id: event.id, charged: chargeAmount, referral_id: resolvedReferralId, identity: resolvedIdentity });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
