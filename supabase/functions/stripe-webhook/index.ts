import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { verifyStripeSignature } from "../_shared/webhook-verify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!secret) return new Response("Not configured", { status: 500, headers: corsHeaders });

    if (!verifyStripeSignature(rawBody, req.headers.get("stripe-signature"), secret)) {
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }

    const event = JSON.parse(rawBody);
    const eventId: string = event.id;
    const type: string = event.type;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const creditable = ["checkout.session.completed", "payment_intent.succeeded", "charge.succeeded"];
    if (!creditable.includes(type)) {
      // Still record it so replays of ignored events are visible and idempotent
      await supabase.rpc("process_payment_webhook", {
        _provider: "stripe",
        _event_id: eventId,
        _event_type: type,
        _reference: null,
        _is_activation: false,
        _payload: event,
      });
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const obj = event.data?.object ?? {};
    const reference: string | null =
      obj.client_reference_id || obj.metadata?.reference || obj.id || null;
    const isActivation = (obj.metadata?.type || "") === "activation";

    const { data, error } = await supabase.rpc("process_payment_webhook", {
      _provider: "stripe",
      _event_id: eventId,
      _event_type: type,
      _reference: reference,
      _is_activation: isActivation,
      _payload: event,
    });

    if (error) {
      console.error("stripe-webhook rpc error:", error.message);
      return new Response("Processing error", { status: 500, headers: corsHeaders });
    }

    const result = data as Record<string, unknown>;
    if (result?.credited) {
      try {
        await supabase.functions.invoke("notify", {
          body: {
            event: result.activation ? "wallet_activated" : "wallet_funded",
            payload: { wallet_id: result.wallet_id, tx_id: result.tx_id },
          },
        });
      } catch (e) {
        console.warn("notify failed", (e as Error).message);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-webhook error:", (err as Error).message);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
