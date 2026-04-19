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
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    // Admin only
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) return json({ error: "Admin only" }, 403);

    const body = await req.json();
    const { action } = body;

    // Record manual events and deduct from escrow
    if (action === "record_events") {
      const { campaign_id, event_type, count, purchase_amount, notes } = body;

      if (!campaign_id || !event_type || !count || count < 1) {
        return json({ error: "Missing campaign_id, event_type, or count" }, 400);
      }

      const validEvents = ["download", "signup", "purchase"];
      if (!validEvents.includes(event_type)) {
        return json({ error: "Invalid event_type" }, 400);
      }

      // Get campaign
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("id, name, budget_remaining, price_download, price_signup, price_purchase, campaign_mode, status")
        .eq("id", campaign_id)
        .single();

      if (!campaign) return json({ error: "Campaign not found" }, 404);
      if (campaign.status !== "active") {
        return json({ error: "Campaign must be active" }, 400);
      }
      // Admin may record events for any campaign mode (manual or api).
      // For api campaigns this serves as a manual reconciliation/override.

      // Calculate deduction
      let unitCost = 0;
      if (event_type === "download") unitCost = Number(campaign.price_download);
      else if (event_type === "signup") unitCost = Number(campaign.price_signup);
      else if (event_type === "purchase") {
        // $1 flat + 10% commission on purchase_amount
        const pAmount = Number(purchase_amount || 0);
        unitCost = 1 + (pAmount * 0.10);
      }

      const totalDeduction = unitCost * count;
      const remaining = Number(campaign.budget_remaining);

      if (totalDeduction > remaining) {
        return json({
          error: `Insufficient escrow. Need $${totalDeduction.toFixed(2)}, have $${remaining.toFixed(2)}.`,
        }, 402);
      }

      // Deduct from escrow
      const newRemaining = remaining - totalDeduction;
      const { error: updateErr } = await supabase
        .from("campaigns")
        .update({ budget_remaining: newRemaining })
        .eq("id", campaign_id);
      if (updateErr) throw updateErr;

      // Record in manual_events
      const { error: insertErr } = await supabase
        .from("manual_events")
        .insert({
          campaign_id,
          event_type,
          count,
          purchase_amount: event_type === "purchase" ? (purchase_amount || 0) : null,
          total_deducted: totalDeduction,
          recorded_by: user.id,
          notes: notes || null,
        });
      if (insertErr) throw insertErr;

      // Also record individual events in the events table so they show in analytics
      const eventRows = [];
      for (let i = 0; i < count; i++) {
        eventRows.push({
          campaign_id,
          event_type,
          external_user_id: `manual_${crypto.randomUUID().slice(0, 8)}`,
          amount: event_type === "purchase" ? (purchase_amount || 0) : null,
        });
      }
      const { error: eventsErr } = await supabase.from("events").insert(eventRows);
      if (eventsErr) throw eventsErr;

      // Record transaction
      const { error: txErr } = await supabase.from("transactions").insert({
        campaign_id,
        amount: totalDeduction,
        description: `Manual ${event_type}: ${count} × $${unitCost.toFixed(2)}`,
      });
      if (txErr) throw txErr;

      return json({
        success: true,
        deducted: totalDeduction,
        budget_remaining: newRemaining,
        events_recorded: count,
      });
    }

    // Get manual events summary for a campaign
    if (action === "get_summary") {
      const { campaign_id } = body;
      if (!campaign_id) return json({ error: "Missing campaign_id" }, 400);

      const { data: events } = await supabase
        .from("manual_events")
        .select("*")
        .eq("campaign_id", campaign_id)
        .order("created_at", { ascending: false });

      return json({ events: events || [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
