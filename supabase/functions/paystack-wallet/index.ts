import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getActiveGateway(supabase: any) {
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "active_payment_gateway")
    .maybeSingle();
  return data?.value || "paystack";
}

async function getGatewaySecret(supabase: any, gateway: string) {
  const key = gateway === "flutterwave" ? "flutterwave_secret_key" : "paystack_secret_key";
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (data?.value) return data.value;
  // Fallback to env
  return gateway === "flutterwave"
    ? Deno.env.get("FLUTTERWAVE_SECRET_KEY")
    : Deno.env.get("PAYSTACK_SECRET_KEY");
}

// Paystack payment initialization
async function initPaystack(secret: string, email: string, amountKobo: number, reference: string, callbackUrl: string, metadata: Record<string, unknown>) {
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, amount: Math.round(amountKobo), reference, callback_url: callbackUrl, metadata }),
  });
  return res.json();
}

// Flutterwave payment initialization
async function initFlutterwave(secret: string, email: string, amountNgn: number, txRef: string, redirectUrl: string, meta: Record<string, unknown>) {
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: amountNgn.toString(),
      currency: "NGN",
      redirect_url: redirectUrl,
      customer: { email },
      meta,
      customizations: { title: "KARBALI ADS", description: "Wallet Transaction" },
    }),
  });
  return res.json();
}

// Flutterwave PSA wallet creation
async function createFlutterwavePSA(secret: string, name: string, email: string) {
  const res = await fetch("https://api.flutterwave.com/v3/payout-subaccounts", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ account_name: name, email, country: "NG", bank_code: "035" }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return jsonResponse({ error: "Invalid token" }, 401);

    const body = await req.json();
    const { action, callback_origin } = body;
    const origin = callback_origin || req.headers.get("origin") || "https://advertiser.karbali.com";

    const gateway = await getActiveGateway(supabase);
    const secret = await getGatewaySecret(supabase, gateway);
    if (!secret) return jsonResponse({ error: `${gateway} not configured` }, 500);

    // Get admin settings
    const { data: settings } = await supabase.from("admin_settings").select("key, value").in("key", ["activation_fee_usd", "usd_to_ngn_rate"]);
    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: { key: string; value: string }) => { settingsMap[s.key] = s.value; });
    const activationFeeUsd = Number(settingsMap["activation_fee_usd"] || "10");
    const usdToNgn = Number(settingsMap["usd_to_ngn_rate"] || "1500");

    if (action === "create_wallet") {
      const { data: existing } = await supabase.from("wallets").select("*").eq("advertiser_id", user.id).maybeSingle();
      if (existing) return jsonResponse({ wallet: existing });

      const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", user.id).single();
      const fullName = profile?.full_name || "Advertiser";
      const email = profile?.email || user.email;

      if (gateway === "paystack") {
        const custRes = await fetch("https://api.paystack.co/customer", {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
          body: JSON.stringify({ email, first_name: fullName.split(" ")[0], last_name: fullName.split(" ").slice(1).join(" ") }),
        });
        const custData = await custRes.json();
        const { data: wallet, error } = await supabase.from("wallets").insert({
          advertiser_id: user.id,
          paystack_customer_code: custData.data?.customer_code || null,
        }).select().single();
        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ wallet });
      } else {
        // Flutterwave PSA wallet
        const psaRes = await createFlutterwavePSA(secret, fullName, email!);
        console.log("Flutterwave PSA response:", JSON.stringify(psaRes));
        const psaData = psaRes.data;
        const { data: wallet, error } = await supabase.from("wallets").insert({
          advertiser_id: user.id,
          flutterwave_psa_reference: psaData?.account_reference || null,
          flutterwave_barter_id: psaData?.barter_id || null,
          flutterwave_nuban: psaData?.nuban || null,
          flutterwave_bank_name: psaData?.bank_name || null,
        }).select().single();
        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ wallet });
      }
    }

    if (action === "initialize_activation") {
      const { amount: customAmount } = body;
      const payAmount = customAmount && Number(customAmount) >= activationFeeUsd ? Number(customAmount) : activationFeeUsd;
      const amountNgn = payAmount * usdToNgn;

      const { data: wallet } = await supabase.from("wallets").select("*").eq("advertiser_id", user.id).maybeSingle();
      if (!wallet) return jsonResponse({ error: "No wallet found" }, 400);
      if (wallet.is_activated) return jsonResponse({ error: "Wallet already activated" }, 400);

      const reference = `act_${user.id.replace(/-/g, "").slice(0, 8)}_${Date.now()}`;
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id, amount: payAmount, type: "activation",
        description: `Wallet activation ($${payAmount})`, reference, status: "pending",
      });

      const profile = await supabase.from("profiles").select("email").eq("id", user.id).single();
      const email = profile.data?.email || user.email;
      const callbackUrl = `${origin}/wallet?activated=true&ref=${reference}`;

      if (gateway === "paystack") {
        const initData = await initPaystack(secret, email!, amountNgn * 100, reference, callbackUrl, { type: "activation", user_id: user.id, wallet_id: wallet.id });
        if (!initData.status || !initData.data?.authorization_url) return jsonResponse({ error: initData.message || "Payment failed", details: initData }, 400);
        return jsonResponse({ authorization_url: initData.data.authorization_url, reference });
      } else {
        const initData = await initFlutterwave(secret, email!, amountNgn, reference, callbackUrl, { type: "activation", user_id: user.id, wallet_id: wallet.id });
        if (initData.status !== "success" || !initData.data?.link) return jsonResponse({ error: initData.message || "Payment failed", details: initData }, 400);
        return jsonResponse({ authorization_url: initData.data.link, reference });
      }
    }

    if (action === "initialize_funding") {
      const { amount } = body;
      if (!amount || amount < 1) return jsonResponse({ error: "Invalid amount" }, 400);
      const amountNgn = amount * usdToNgn;

      const { data: wallet } = await supabase.from("wallets").select("*").eq("advertiser_id", user.id).maybeSingle();
      if (!wallet) return jsonResponse({ error: "No wallet found" }, 400);

      const reference = `fund_${user.id.replace(/-/g, "").slice(0, 8)}_${Date.now()}`;
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id, amount, type: "funding",
        description: `Wallet funding ($${amount})`, reference, status: "pending",
      });

      const profile = await supabase.from("profiles").select("email").eq("id", user.id).single();
      const email = profile.data?.email || user.email;
      const callbackUrl = `${origin}/wallet?funded=true&ref=${reference}`;

      if (gateway === "paystack") {
        const initData = await initPaystack(secret, email!, amountNgn * 100, reference, callbackUrl, { type: "funding", user_id: user.id, wallet_id: wallet.id, usd_amount: amount });
        if (!initData.status || !initData.data?.authorization_url) return jsonResponse({ error: initData.message || "Payment failed", details: initData }, 400);
        return jsonResponse({ authorization_url: initData.data.authorization_url, reference });
      } else {
        const initData = await initFlutterwave(secret, email!, amountNgn, reference, callbackUrl, { type: "funding", user_id: user.id, wallet_id: wallet.id, usd_amount: amount });
        if (initData.status !== "success" || !initData.data?.link) return jsonResponse({ error: initData.message || "Payment failed", details: initData }, 400);
        return jsonResponse({ authorization_url: initData.data.link, reference });
      }
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    console.error("Edge function error:", (err as Error).message);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
