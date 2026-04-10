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

const POINT_VALUE_NAIRA = 0.15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { click_id, event_type } = await req.json();

    if (!click_id || !event_type) {
      return json({ error: "Missing click_id or event_type" }, 400);
    }

    const validEvents = ["click", "signup", "install", "purchase", "view"];
    if (!validEvents.includes(event_type)) {
      return json({ error: "Invalid event_type" }, 400);
    }

    // Get click record
    const { data: click, error: clickError } = await supabase
      .from("extension_clicks")
      .select("id, ext_user_id, campaign_id, status")
      .eq("id", click_id)
      .single();

    if (clickError || !click) {
      return json({ error: "Click not found" }, 404);
    }

    // Check if already converted for this click
    const { count: existing } = await supabase
      .from("extension_conversions")
      .select("id", { count: "exact", head: true })
      .eq("click_id", click_id)
      .eq("event_type", event_type);

    if ((existing || 0) > 0) {
      return json({ error: "Conversion already recorded" }, 409);
    }

    // Check campaign is still valid
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, status, budget_remaining, price_download, price_signup, price_purchase")
      .eq("id", click.campaign_id)
      .single();

    if (!campaign || campaign.status !== "active") {
      return json({ error: "Campaign no longer active" }, 403);
    }

    // Determine payout based on event type
    let payoutNaira = 0;
    if (event_type === "signup") payoutNaira = Number(campaign.price_signup || 0);
    else if (event_type === "install" || event_type === "click") payoutNaira = Number(campaign.price_download || 0);
    else if (event_type === "purchase") payoutNaira = Number(campaign.price_purchase || 0);
    else if (event_type === "view") payoutNaira = Number(campaign.price_download || 0) * 0.1;

    // Check budget
    if (payoutNaira > Number(campaign.budget_remaining)) {
      await supabase.from("campaigns").update({ status: "rejected" }).eq("id", campaign.id);
      return json({ error: "Campaign budget exhausted" }, 402);
    }

    // Record conversion
    const { data: conversion } = await supabase
      .from("extension_conversions")
      .insert({
        click_id,
        event_type,
        status: "completed",
        rewarded: true,
      })
      .select("id")
      .single();

    // Calculate points
    const points = Math.floor(payoutNaira / POINT_VALUE_NAIRA);

    // Record reward
    await supabase.from("extension_rewards").insert({
      ext_user_id: click.ext_user_id,
      campaign_id: click.campaign_id,
      click_id: click.id,
      points,
      reward_type: `${event_type}_reward`,
    });

    // Deduct from campaign budget
    const newBudget = Number(campaign.budget_remaining) - payoutNaira;
    const updateData: Record<string, unknown> = { budget_remaining: newBudget };
    if (newBudget <= 0) updateData.status = "rejected";
    await supabase.from("campaigns").update(updateData).eq("id", campaign.id);

    // Update click status
    await supabase.from("extension_clicks").update({ status: "converted" }).eq("id", click.id);

    // Send points to external user system
    try {
      const extSupabase = createClient(
        Deno.env.get("EXT_USER_SUPABASE_URL")!,
        Deno.env.get("EXT_USER_SUPABASE_SERVICE_KEY")!
      );

      // Try to update points in external system
      // This assumes the external system has a points/rewards table
      // Adjust the table name and column names as needed
      await extSupabase.rpc("add_user_points", {
        p_user_id: click.ext_user_id,
        p_points: points,
      });
    } catch (extErr) {
      console.error("Failed to update external points:", extErr);
      // Points are logged locally even if external update fails
    }

    // Record transaction in advertiser system
    await supabase.from("transactions").insert({
      campaign_id: click.campaign_id,
      amount: payoutNaira,
      description: `Extension ${event_type} conversion`,
    });

    return json({
      success: true,
      conversion_id: conversion?.id,
      points_awarded: points,
      payout_naira: payoutNaira,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
