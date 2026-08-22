import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature, verif-hash",
};

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

    const paystackSignature = req.headers.get("x-paystack-signature");
    const flutterwaveHash = req.headers.get("verif-hash");

    let provider = "unknown";
    let reference: string | null = null;
    let metadataType: string | null = null;
    let eventType: string | null = null;
    let eventId: string | null = null;
    let event: Record<string, any>;

    if (paystackSignature) {
      provider = "paystack";
      const { data: paystackSetting } = await supabase
        .from("admin_settings").select("value").eq("key", "paystack_secret_key").maybeSingle();
      const paystackSecret = paystackSetting?.value || Deno.env.get("PAYSTACK_SECRET_KEY");
      if (!paystackSecret) return new Response("Not configured", { status: 500 });

      const hash = createHmac("sha512", paystackSecret).update(rawBody).digest("hex");
      if (!safeEqual(hash, paystackSignature)) {
        return new Response("Invalid signature", { status: 401 });
      }

      event = JSON.parse(rawBody);
      eventType = event.event;
      eventId = String(event.data?.id ?? event.id ?? await sha256Hex(rawBody));
      if (eventType !== "charge.success") {
        await supabase.rpc("process_payment_webhook", {
          _provider: provider, _event_id: eventId, _event_type: eventType,
          _reference: null, _is_activation: false, _payload: event,
        });
        return new Response("OK", { status: 200 });
      }
      reference = event.data?.reference ?? null;
      metadataType = event.data?.metadata?.type ?? null;
    } else if (flutterwaveHash) {
      provider = "flutterwave";
      const { data: fwSetting } = await supabase
        .from("admin_settings").select("value").eq("key", "flutterwave_webhook_hash").maybeSingle();
      const expectedHash = fwSetting?.value || Deno.env.get("FLUTTERWAVE_WEBHOOK_HASH");
      if (!expectedHash) return new Response("Not configured", { status: 500 });
      if (!safeEqual(expectedHash, flutterwaveHash)) {
        return new Response("Invalid signature", { status: 401 });
      }

      event = JSON.parse(rawBody);
      eventType = event.event ?? null;
      eventId = String(event.data?.id ?? event.id ?? await sha256Hex(rawBody));

      if (eventType === "charge.completed" && event.data?.status === "successful") {
        reference = event.data?.tx_ref ?? null;
        metadataType = event.data?.meta?.type ?? null;
      } else if (eventType === "transfer.completed" && event.data?.status === "SUCCESSFUL") {
        reference = event.data?.reference ?? null;
        metadataType = "funding";
      } else {
        await supabase.rpc("process_payment_webhook", {
          _provider: provider, _event_id: eventId, _event_type: eventType,
          _reference: null, _is_activation: false, _payload: event,
        });
        return new Response("OK", { status: 200 });
      }
    } else {
      // Unsigned callers are never trusted
      return new Response("Invalid signature", { status: 401 });
    }

    const { data, error } = await supabase.rpc("process_payment_webhook", {
      _provider: provider,
      _event_id: eventId,
      _event_type: eventType,
      _reference: reference,
      _is_activation: metadataType === "activation",
      _payload: event,
    });

    if (error) {
      console.error("process_payment_webhook error:", error.message);
      return new Response("Processing error", { status: 500 });
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
      } catch (e) { console.warn("notify failed", (e as Error).message); }
    }

    return new Response("OK", { status: 200 });
  } catch (err: unknown) {
    console.error("Webhook error:", (err as Error).message);
    return new Response("Internal error", { status: 500 });
  }
});
