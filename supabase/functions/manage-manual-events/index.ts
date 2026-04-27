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

      // Auto-close if target reached
      try {
        const { count: totalEvents } = await supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign_id);
        const { data: campRow } = await supabase
          .from("campaigns")
          .select("target_users, status, advertiser_id, budget_remaining")
          .eq("id", campaign_id)
          .maybeSingle();
        const target = Number(campRow?.target_users || 0);
        if (target > 0 && (totalEvents || 0) >= target && campRow?.status === "active") {
          await supabase
            .from("campaigns")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", campaign_id);
          // Refund leftover escrow
          const leftover = Number(campRow.budget_remaining || 0);
          if (leftover > 0) {
            const { data: wallet } = await supabase
              .from("wallets")
              .select("id, balance")
              .eq("advertiser_id", campRow.advertiser_id)
              .maybeSingle();
            if (wallet) {
              await supabase
                .from("wallets")
                .update({ balance: Number(wallet.balance) + leftover, updated_at: new Date().toISOString() })
                .eq("id", wallet.id);
              await supabase.from("wallet_transactions").insert({
                wallet_id: wallet.id,
                amount: leftover,
                type: "refund",
                status: "completed",
                description: "Refund from completed campaign",
              });
              await supabase.from("campaigns").update({ budget_remaining: 0 }).eq("id", campaign_id);
            }
          }
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-campaign-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ action: "fulfilled", campaign_id }),
          }).catch((e) => console.warn("fulfillment email failed", e));
        }
      } catch (e) {
        console.warn("auto-close check failed", e);
      }

      return json({
        success: true,
        deducted: totalDeduction,
        budget_remaining: newRemaining,
        events_recorded: count,
      });
    }

    if (action === "record_engagement_interactions") {
      const { campaign_id, count, correct_count, notes } = body;

      const interactionCount = Number(count || 0);
      const correctCount = Number(correct_count || 0);
      if (!campaign_id || interactionCount < 1) {
        return json({ error: "Missing campaign_id or valid count" }, 400);
      }
      if (correctCount < 0 || correctCount > interactionCount) {
        return json({ error: "correct_count must be between 0 and count" }, 400);
      }

      const { data: campaign } = await supabase
        .from("campaigns")
        .select("id, name, budget_remaining, status, ad_type")
        .eq("id", campaign_id)
        .single();

      if (!campaign) return json({ error: "Campaign not found" }, 404);
      if (campaign.status !== "active") return json({ error: "Campaign must be active" }, 400);
      if (campaign.ad_type !== "engagement") return json({ error: "Only engagement campaigns support this action" }, 400);

      const [{ data: creative }, { data: questions }] = await Promise.all([
        supabase
          .from("creative_campaigns")
          .select("rate_per_interaction")
          .eq("campaign_id", campaign_id)
          .maybeSingle(),
        supabase
          .from("campaign_questions")
          .select("id")
          .eq("campaign_id", campaign_id)
          .order("created_at", { ascending: true }),
      ]);

      if (!questions || questions.length === 0) {
        return json({ error: "Generate quiz questions before recording engagement interactions" }, 400);
      }

      const unitCost = Number(creative?.rate_per_interaction || 0.20);
      const totalDeduction = unitCost * interactionCount;
      const remaining = Number(campaign.budget_remaining);
      if (totalDeduction > remaining) {
        return json({
          error: `Insufficient escrow. Need $${totalDeduction.toFixed(2)}, have $${remaining.toFixed(2)}.`,
        }, 402);
      }

      const newRemaining = remaining - totalDeduction;
      const updateData: Record<string, unknown> = { budget_remaining: newRemaining };
      if (newRemaining <= 0) updateData.status = "rejected";
      const { error: updateErr } = await supabase
        .from("campaigns")
        .update(updateData)
        .eq("id", campaign_id);
      if (updateErr) throw updateErr;

      const { error: manualErr } = await supabase
        .from("manual_events")
        .insert({
          campaign_id,
          event_type: "engagement_interaction",
          count: interactionCount,
          purchase_amount: null,
          total_deducted: totalDeduction,
          recorded_by: user.id,
          notes: notes || null,
        });
      if (manualErr) throw manualErr;

      const interactionRows = Array.from({ length: interactionCount }, (_, index) => ({
        campaign_id,
        question_id: questions[index % questions.length].id,
        external_user_id: `manual_eng_${crypto.randomUUID().slice(0, 8)}`,
        is_correct: index < correctCount,
        attempt_number: 1,
        points_earned: index < correctCount ? 1 : 0,
        charge_amount: unitCost,
      }));
      const { error: insertInteractionErr } = await supabase.from("offerwall_interactions").insert(interactionRows);
      if (insertInteractionErr) throw insertInteractionErr;

      const { error: txErr } = await supabase.from("transactions").insert({
        campaign_id,
        amount: totalDeduction,
        description: `Manual engagement interactions: ${interactionCount} × $${unitCost.toFixed(2)}`,
      });
      if (txErr) throw txErr;

      return json({
        success: true,
        deducted: totalDeduction,
        budget_remaining: newRemaining,
        events_recorded: interactionCount,
        correct_recorded: correctCount,
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
