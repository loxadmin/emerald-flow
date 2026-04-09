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

const DEFAULT_CATEGORY_EVENTS = ["download", "signup", "purchase"];

function parseCategoryEvents(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || "[]");
    if (Array.isArray(parsed)) {
      const events = parsed.filter((event): event is string => DEFAULT_CATEGORY_EVENTS.includes(String(event)));
      return events.length > 0 ? events : DEFAULT_CATEGORY_EVENTS;
    }
  } catch {
    return DEFAULT_CATEGORY_EVENTS;
  }

  return DEFAULT_CATEGORY_EVENTS;
}

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

    const body = await req.json();
    const { action, campaign_id, api_key, code, category_id } = body;

    if (action === "get_category_events") {
      if (!category_id) {
        return jsonResponse({ error: "Missing category_id" }, 400);
      }

      const { data: setting } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", `category_events:${category_id}`)
        .maybeSingle();

      return jsonResponse({ events: parseCategoryEvents(setting?.value) });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!adminRole;

    if (action === "create_api_key") {
      if (!campaign_id || !api_key) {
        return jsonResponse({ error: "Missing campaign_id or api_key" }, 400);
      }

      const { data: campaign } = await supabase
        .from("campaigns")
        .select("advertiser_id")
        .eq("id", campaign_id)
        .maybeSingle();

      if (!campaign || (!isAdmin && campaign.advertiser_id !== user.id)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const { error } = await supabase
        .from("api_keys")
        .insert({ campaign_id, key: api_key });
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    if (action === "submit_campaign") {
      if (!campaign_id) {
        return jsonResponse({ error: "Missing campaign_id" }, 400);
      }

      const { data: campaign } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaign_id)
        .maybeSingle();

      if (!campaign || (!isAdmin && campaign.advertiser_id !== user.id)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const totalCost = Number(campaign.total_cost);
      if (totalCost <= 0) {
        return jsonResponse({ error: "Campaign has no cost configured" }, 400);
      }

      // Get wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("advertiser_id", campaign.advertiser_id)
        .single();

      if (!wallet) {
        return jsonResponse({ error: "Wallet not found" }, 404);
      }

      if (Number(wallet.balance) < totalCost) {
        return jsonResponse({
          error: `Insufficient balance. Need $${totalCost.toFixed(2)}, have $${Number(wallet.balance).toFixed(2)}.`,
        }, 402);
      }

      // Atomic: deduct wallet → fund escrow
      const newBalance = Number(wallet.balance) - totalCost;
      const { error: walletErr } = await supabase
        .from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", wallet.id);
      if (walletErr) throw walletErr;

      // Record wallet transaction
      const { error: txErr } = await supabase
        .from("wallet_transactions")
        .insert({
          wallet_id: wallet.id,
          amount: totalCost,
          type: "escrow",
          status: "completed",
          description: `Campaign escrow: ${campaign.name}`,
        });
      if (txErr) throw txErr;

      // Activate campaign escrow (budget_remaining) and set status
      const { error: campErr } = await supabase
        .from("campaigns")
        .update({
          budget_remaining: totalCost,
          status: "pending",
          is_draft: false,
        })
        .eq("id", campaign_id);
      if (campErr) throw campErr;

      return jsonResponse({
        success: true,
        escrow_balance: totalCost,
        wallet_balance: newBalance,
      });
    }

    if (action === "create_referral") {
      if (!campaign_id || !code) {
        return jsonResponse({ error: "Missing campaign_id or code" }, 400);
      }

      const { data: campaign } = await supabase
        .from("campaigns")
        .select("advertiser_id")
        .eq("id", campaign_id)
        .maybeSingle();

      if (!campaign || (!isAdmin && campaign.advertiser_id !== user.id)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

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
      return jsonResponse({ success: true, code });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
