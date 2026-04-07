import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Read Paystack secret from admin_settings, fallback to env var
    const { data: paystackSetting } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "paystack_secret_key")
      .maybeSingle();
    const paystackSecret = paystackSetting?.value || Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      return new Response("Not configured", { status: 500 });
    }

    // Verify Paystack signature
    const signature = req.headers.get("x-paystack-signature");
    if (signature) {
      const hash = createHmac("sha512", paystackSecret).update(rawBody).digest("hex");
      if (hash !== signature) {
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);

    if (event.event !== "charge.success") {
      return new Response("OK", { status: 200 });
    }

    const { reference, metadata } = event.data;
    if (!reference || !metadata) {
      return new Response("OK", { status: 200 });
    }

    // reuse supabase client created above

    // Find the pending transaction
    const { data: tx } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("reference", reference)
      .eq("status", "pending")
      .maybeSingle();

    if (!tx) {
      return new Response("Transaction not found or already processed", { status: 200 });
    }

    // Mark transaction as completed
    await supabase.from("wallet_transactions").update({ status: "completed" }).eq("id", tx.id);

    // Update wallet balance
    const { data: wallet } = await supabase.from("wallets").select("*").eq("id", tx.wallet_id).single();
    if (!wallet) {
      return new Response("Wallet not found", { status: 200 });
    }

    const newBalance = Number(wallet.balance) + Number(tx.amount);
    const updates: Record<string, unknown> = {
      balance: newBalance,
      updated_at: new Date().toISOString(),
    };

    // If activation payment, mark wallet as activated
    if (metadata.type === "activation") {
      updates.is_activated = true;

      // Also update advertiser_categories status if on waiting list
      await supabase
        .from("advertiser_categories")
        .update({ status: "active" })
        .eq("advertiser_id", wallet.advertiser_id)
        .eq("status", "waiting_list");
    }

    await supabase.from("wallets").update(updates).eq("id", wallet.id);

    return new Response("OK", { status: 200 });
  } catch (err: unknown) {
    console.error("Webhook error:", (err as Error).message);
    return new Response("Internal error", { status: 500 });
  }
});
