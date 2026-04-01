import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!paystackSecret) {
      console.error("PAYSTACK_SECRET_KEY is not set");
      return jsonResponse({ error: "Payment system not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    const body = await req.json();
    const { action, callback_origin } = body;

    // Use callback_origin from request body (sent by client), fallback to referer/origin header
    const origin = callback_origin || req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "https://advertiser.karbali.com";

    // Get admin settings
    const { data: settings } = await supabase.from("admin_settings").select("key, value").in("key", ["activation_fee_usd", "usd_to_ngn_rate"]);
    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: { key: string; value: string }) => { settingsMap[s.key] = s.value; });
    const activationFeeUsd = Number(settingsMap["activation_fee_usd"] || "10");
    const usdToNgn = Number(settingsMap["usd_to_ngn_rate"] || "1500");

    if (action === "create_wallet") {
      const { data: existing } = await supabase.from("wallets").select("*").eq("advertiser_id", user.id).maybeSingle();
      if (existing) {
        return jsonResponse({ wallet: existing });
      }

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
      console.log("Paystack customer response:", JSON.stringify(custData));

      const { data: wallet, error } = await supabase.from("wallets").insert({
        advertiser_id: user.id,
        paystack_customer_code: custData.data?.customer_code || null,
      }).select().single();

      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      return jsonResponse({ wallet });
    }

    if (action === "initialize_activation") {
      const { amount: customAmount } = body;
      // Allow custom amount >= activation fee
      const payAmount = customAmount && Number(customAmount) >= activationFeeUsd ? Number(customAmount) : activationFeeUsd;
      const amountNgn = payAmount * usdToNgn * 100; // Paystack uses kobo

      const { data: wallet } = await supabase.from("wallets").select("*").eq("advertiser_id", user.id).maybeSingle();
      if (!wallet) {
        return jsonResponse({ error: "No wallet found" }, 400);
      }
      if (wallet.is_activated) {
        return jsonResponse({ error: "Wallet already activated" }, 400);
      }

      const reference = `act_${user.id.replace(/-/g, "").slice(0, 8)}_${Date.now()}`;

      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        amount: payAmount,
        type: "activation",
        description: `Wallet activation ($${payAmount})`,
        reference,
        status: "pending",
      });

      const profile = await supabase.from("profiles").select("email").eq("id", user.id).single();
      const callbackUrl = `${origin}/wallet?activated=true`;
      console.log("Paystack init activation with callback:", callbackUrl, "amount kobo:", amountNgn);

      const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${paystackSecret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile.data?.email || user.email,
          amount: Math.round(amountNgn),
          reference,
          callback_url: callbackUrl,
          metadata: { type: "activation", user_id: user.id, wallet_id: wallet.id },
        }),
      });
      const initData = await initRes.json();
      console.log("Paystack init response:", JSON.stringify(initData));

      if (!initData.status || !initData.data?.authorization_url) {
        return jsonResponse({ error: initData.message || "Payment initialization failed", details: initData }, 400);
      }

      return jsonResponse({ authorization_url: initData.data.authorization_url, reference });
    }

    if (action === "initialize_funding") {
      const { amount } = body;
      if (!amount || amount < 1) {
        return jsonResponse({ error: "Invalid amount" }, 400);
      }

      const { data: wallet } = await supabase.from("wallets").select("*").eq("advertiser_id", user.id).maybeSingle();
      if (!wallet) {
        return jsonResponse({ error: "No wallet found" }, 400);
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
      const callbackUrl = `${origin}/wallet?funded=true`;
      console.log("Paystack init funding with callback:", callbackUrl, "amount kobo:", amountNgn);

      const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${paystackSecret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile.data?.email || user.email,
          amount: Math.round(amountNgn),
          reference,
          callback_url: callbackUrl,
          metadata: { type: "funding", user_id: user.id, wallet_id: wallet.id, usd_amount: amount },
        }),
      });
      const initData = await initRes.json();
      console.log("Paystack funding response:", JSON.stringify(initData));

      if (!initData.status || !initData.data?.authorization_url) {
        return jsonResponse({ error: initData.message || "Payment initialization failed", details: initData }, 400);
      }

      return jsonResponse({ authorization_url: initData.data.authorization_url, reference });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    console.error("Edge function error:", (err as Error).message);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
