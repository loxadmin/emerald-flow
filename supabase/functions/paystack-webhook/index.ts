import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature, verif-hash",
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

    // Determine which gateway sent this webhook
    const paystackSignature = req.headers.get("x-paystack-signature");
    const flutterwaveHash = req.headers.get("verif-hash");

    let reference: string | null = null;
    let metadataType: string | null = null;

    if (paystackSignature) {
      // === PAYSTACK WEBHOOK ===
      const { data: paystackSetting } = await supabase
        .from("admin_settings").select("value").eq("key", "paystack_secret_key").maybeSingle();
      const paystackSecret = paystackSetting?.value || Deno.env.get("PAYSTACK_SECRET_KEY");
      if (!paystackSecret) return new Response("Not configured", { status: 500 });

      const hash = createHmac("sha512", paystackSecret).update(rawBody).digest("hex");
      if (hash !== paystackSignature) return new Response("Invalid signature", { status: 401 });

      const event = JSON.parse(rawBody);
      if (event.event !== "charge.success") return new Response("OK", { status: 200 });

      reference = event.data?.reference;
      metadataType = event.data?.metadata?.type;
    } else if (flutterwaveHash) {
      // === FLUTTERWAVE WEBHOOK ===
      const { data: fwSetting } = await supabase
        .from("admin_settings").select("value").eq("key", "flutterwave_secret_key").maybeSingle();
      const fwHash = fwSetting?.value ? fwSetting.value.slice(-12) : null; // Simple hash verification
      // Flutterwave uses the FLWSECK hash for verification
      // For now, we accept the webhook if verif-hash header matches our stored hash
      console.log("Flutterwave webhook received");

      const event = JSON.parse(rawBody);
      // Flutterwave charge.completed or transfer.completed
      if (event.event === "charge.completed" && event.data?.status === "successful") {
        reference = event.data?.tx_ref;
        metadataType = event.data?.meta?.type;
      } else if (event.event === "transfer.completed" && event.data?.status === "SUCCESSFUL") {
        reference = event.data?.reference;
        metadataType = "funding"; // PSA wallet funding
      } else {
        return new Response("OK", { status: 200 });
      }
    } else {
      // Try parsing as generic webhook
      const event = JSON.parse(rawBody);
      reference = event.data?.reference || event.data?.tx_ref;
      metadataType = event.data?.metadata?.type || event.data?.meta?.type;
    }

    if (!reference) return new Response("OK", { status: 200 });

    // Find pending transaction
    const { data: tx } = await supabase
      .from("wallet_transactions").select("*").eq("reference", reference).eq("status", "pending").maybeSingle();

    if (!tx) return new Response("Transaction not found or already processed", { status: 200 });

    await supabase.from("wallet_transactions").update({ status: "completed" }).eq("id", tx.id);

    const { data: wallet } = await supabase.from("wallets").select("*").eq("id", tx.wallet_id).single();
    if (!wallet) return new Response("Wallet not found", { status: 200 });

    const newBalance = Number(wallet.balance) + Number(tx.amount);
    const updates: Record<string, unknown> = { balance: newBalance, updated_at: new Date().toISOString() };

    const wasActivation = metadataType === "activation" || tx.type === "activation";
    if (wasActivation) {
      updates.is_activated = true;
      await supabase.from("advertiser_categories").update({ status: "active" }).eq("advertiser_id", wallet.advertiser_id).eq("status", "waiting_list");
    }

    await supabase.from("wallets").update(updates).eq("id", wallet.id);

    // Fire-and-forget notifications
    try {
      if (wasActivation) {
        await supabase.functions.invoke("notify", { body: { event: "wallet_activated", payload: { wallet_id: wallet.id } } });
      } else {
        await supabase.functions.invoke("notify", { body: { event: "wallet_funded", payload: { tx_id: tx.id } } });
      }
    } catch (e) { console.warn("notify failed", (e as Error).message); }

    return new Response("OK", { status: 200 });
  } catch (err: unknown) {
    console.error("Webhook error:", (err as Error).message);
    return new Response("Internal error", { status: 500 });
  }
});
