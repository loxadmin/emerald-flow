import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  paystackSignature,
  stripeSignatureHeader,
  verifyPaystackSignature,
  verifyStripeSignature,
} from "../_shared/webhook-verify.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const BODY = JSON.stringify({ id: "evt_test_1", type: "payment_intent.succeeded", data: { object: { id: "pi_1" } } });

Deno.test("stripe: valid signature verifies", () => {
  const header = stripeSignatureHeader(BODY, "whsec_test");
  assert(verifyStripeSignature(BODY, header, "whsec_test"));
});

Deno.test("stripe: tampered body fails", () => {
  const header = stripeSignatureHeader(BODY, "whsec_test");
  assert(!verifyStripeSignature(BODY + " ", header, "whsec_test"));
});

Deno.test("stripe: wrong secret fails", () => {
  const header = stripeSignatureHeader(BODY, "whsec_test");
  assert(!verifyStripeSignature(BODY, header, "whsec_other"));
});

Deno.test("stripe: replayed old timestamp is rejected", () => {
  const old = Math.floor(Date.now() / 1000) - 3600;
  const header = stripeSignatureHeader(BODY, "whsec_test", old);
  assert(!verifyStripeSignature(BODY, header, "whsec_test"));
});

Deno.test("stripe: missing signature header rejected", () => {
  assert(!verifyStripeSignature(BODY, null, "whsec_test"));
});

Deno.test("paystack: hmac sha512 signature round-trips", () => {
  const sig = paystackSignature(BODY, "sk_test");
  assert(verifyPaystackSignature(BODY, sig, "sk_test"));
  assert(!verifyPaystackSignature(BODY, sig, "sk_live"));
  assert(!verifyPaystackSignature(BODY, "deadbeef", "sk_test"));
});

Deno.test("stripe-webhook endpoint rejects unsigned requests", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON },
    body: BODY,
  });
  const text = await res.text();
  assert(res.status === 401 || res.status === 500, `unexpected status ${res.status}: ${text}`);
});

Deno.test("paystack-webhook endpoint rejects unsigned requests", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify({ event: "charge.success", data: { reference: "x" } }),
  });
  await res.text();
  assertEquals(res.status, 401);
});

Deno.test("paystack-webhook rejects a forged signature", async () => {
  const body = JSON.stringify({ event: "charge.success", data: { id: 1, reference: "forged-ref" } });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      "x-paystack-signature": paystackSignature(body, "not-the-real-secret"),
    },
    body,
  });
  await res.text();
  assert(res.status === 401 || res.status === 500, `unexpected status ${res.status}`);
});

Deno.test("concurrent unsigned replays never get accepted", async () => {
  const body = JSON.stringify({ event: "charge.success", data: { id: 99, reference: "replay-ref" } });
  const results = await Promise.all(
    Array.from({ length: 15 }, () =>
      fetch(`${SUPABASE_URL}/functions/v1/paystack-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON },
        body,
      }).then(async (r) => {
        await r.text();
        return r.status;
      })
    ),
  );
  assert(results.every((s) => s !== 200), `some replays were accepted: ${results.join(",")}`);
});
