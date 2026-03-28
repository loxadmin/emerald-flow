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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!paystackSecret) {
      return new Response(JSON.stringify({ error: "Payment system not configured" }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { action } = body;

    // Get admin settings
    const { data: settings } = await supabase.from("admin_settings").select("key, value").in("key", ["activation_fee_usd", "usd_to_ngn_rate"]);
    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: { key: string; value: string }) => { settingsMap[s.key] = s.value; });
    const activationFeeUsd = Number(settingsMap["activation_fee_usd"] || "10");
    const usdToNgn = Number(settingsMap["usd_to_ngn_rate"] || "1500");

    if (action === "create_wallet") {
      // Check if wallet exists
      const { data: existing } = await supabase.from("wallets").select("*").eq("advertiser_id", user.id).maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ wallet: existing }), { headers: corsHeaders });
      }

      // Get profile
      const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", user.id).single();

      // Create Paystack customer
      const custRes = await fetch("https://api.paystack.co/customer", {
        method: "POST",
        headers: { Authorization: `Bearer ${paystackSecret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile?.email || user.email,
          first_name: profile?.full_name?.split(" ")[0] || "",
          last_name: profile?.full_name?.split(" ").slice(1).join(" ") || "",
        }),
      });
      const custData = await custRes.json();

      // Create wallet
      const { data: wallet, error } = await supabase.from("wallets").insert({
        advertiser_id: user.id,
        paystack_customer_code: custData.data?.customer_code || null,
      }).select().single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ wallet }), { headers: corsHeaders });
    }

    if (action === "initialize_activation") {
      const amountNgn = activationFeeUsd * usdToNgn * 100; // Paystack uses kobo

      const { data: wallet } = await supabase.from("wallets").select("*").eq("advertiser_id", user.id).maybeSingle();
      if (!wallet) {
        return new Response(JSON.stringify({ error: "No wallet found" }), { status: 400, headers: corsHeaders });
      }
      if (wallet.is_activated) {
        return new Response(JSON.stringify({ error: "Wallet already activated" }), { status: 400, headers: corsHeaders });
      }

      const reference = `act_${user.id.replace(/-/g, "").slice(0, 8)}_${Date.now()}`;

      // Create pending transaction
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        amount: activationFeeUsd,
        type: "activation",
        description: `Wallet activation fee ($${activationFeeUsd})`,
        reference,
        status: "pending",
      });

      // Initialize Paystack transaction
      const profile = await supabase.from("profiles").select("email").eq("id", user.id).single();
      const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${paystackSecret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile.data?.email || user.email,
          amount: amountNgn,
          reference,
          callback_url: `${req.headers.get("origin") || supabaseUrl}/wallet?activated=true`,
          metadata: { type: "activation", user_id: user.id, wallet_id: wallet.id },
        }),
      });
      const initData = await initRes.json();

      if (!initData.status) {
        return new Response(JSON.stringify({ error: initData.message || "Payment initialization failed" }), { status: 400, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ authorization_url: initData.data.authorization_url, reference }), { headers: corsHeaders });
    }

    if (action === "initialize_funding") {
      const { amount } = body;
      if (!amount || amount < 1) {
        return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400, headers: corsHeaders });
      }

      const { data: wallet } = await supabase.from("wallets").select("*").eq("advertiser_id", user.id).maybeSingle();
      if (!wallet) {
        return new Response(JSON.stringify({ error: "No wallet found" }), { status: 400, headers: corsHeaders });
      }

      const amountNgn = amount * usdToNgn * 100;
      const reference = `fund_${user.id.replace(/-/g, "").slice(0, 8)}_${Date.now()}`;

      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        amount,
        type: "funding",
        description: `Wallet funding ($${amount})`,
        reference,
        status: "pending",
      });

      const profile = await supabase.from("profiles").select("email").eq("id", user.id).single();
      const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${paystackSecret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile.data?.email || user.email,
          amount: amountNgn,
          reference,
          callback_url: `${req.headers.get("origin") || supabaseUrl}/wallet?funded=true`,
          metadata: { type: "funding", user_id: user.id, wallet_id: wallet.id, usd_amount: amount },
        }),
      });
      const initData = await initRes.json();

      if (!initData.status) {
        return new Response(JSON.stringify({ error: initData.message || "Payment initialization failed" }), { status: 400, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ authorization_url: initData.data.authorization_url, reference }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
