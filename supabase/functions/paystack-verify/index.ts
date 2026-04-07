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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Determine active gateway
    const { data: gatewaySetting } = await supabaseAdmin
      .from("admin_settings").select("value").eq("key", "active_payment_gateway").maybeSingle();
    const gateway = gatewaySetting?.value || "paystack";

    // Get appropriate secret
    const secretKey = gateway === "flutterwave" ? "flutterwave_secret_key" : "paystack_secret_key";
    const { data: secretSetting } = await supabaseAdmin
      .from("admin_settings").select("value").eq("key", secretKey).maybeSingle();
    const secret = secretSetting?.value || (gateway === "flutterwave" ? Deno.env.get("FLUTTERWAVE_SECRET_KEY") : Deno.env.get("PAYSTACK_SECRET_KEY"));
    if (!secret) return jsonResponse({ error: "Payment system not configured" }, 500);

    // Verify calling user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return jsonResponse({ error: "Invalid token" }, 401);

    const { reference } = await req.json();
    if (!reference || typeof reference !== "string") return jsonResponse({ error: "Missing reference" }, 400);

    // Verify with the appropriate gateway
    let verified = false;
    if (gateway === "paystack") {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const verifyData = await verifyRes.json();
      console.log("Paystack verify:", JSON.stringify(verifyData));
      verified = verifyData.status && verifyData.data?.status === "success";
    } else {
      // Flutterwave: verify by tx_ref
      const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const verifyData = await verifyRes.json();
      console.log("Flutterwave verify:", JSON.stringify(verifyData));
      verified = verifyData.status === "success" && verifyData.data?.status === "successful";
    }

    if (!verified) return jsonResponse({ error: "Payment not verified" }, 400);

    // Find pending transaction
    const { data: tx } = await supabaseAdmin
      .from("wallet_transactions")
      .select("*, wallets!inner(id, advertiser_id, balance)")
      .eq("reference", reference)
      .eq("wallets.advertiser_id", user.id)
      .maybeSingle();

    if (!tx) return jsonResponse({ error: "Transaction not found" }, 404);

    if (tx.status === "completed") {
      const { data: wallet } = await supabaseAdmin.from("wallets").select("balance, is_activated").eq("advertiser_id", user.id).single();
      return jsonResponse({ already_processed: true, wallet });
    }

    await supabaseAdmin.from("wallet_transactions").update({ status: "completed" }).eq("id", tx.id);

    const walletInfo = tx.wallets as { id: string; advertiser_id: string; balance: number };
    const newBalance = Number(walletInfo.balance) + Number(tx.amount);
    const updates: Record<string, unknown> = { balance: newBalance, updated_at: new Date().toISOString() };

    if (tx.type === "activation") {
      updates.is_activated = true;
      await supabaseAdmin.from("advertiser_categories").update({ status: "active" }).eq("advertiser_id", user.id).eq("status", "waiting_list");
    }

    await supabaseAdmin.from("wallets").update(updates).eq("id", walletInfo.id);
    const { data: updatedWallet } = await supabaseAdmin.from("wallets").select("balance, is_activated").eq("id", walletInfo.id).single();

    return jsonResponse({ success: true, wallet: updatedWallet });
  } catch (err: unknown) {
    console.error("Verify error:", (err as Error).message);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
