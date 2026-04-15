import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, origin, referer",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const tid = String(body.tid || body.client_id || "").trim();
    const referralCode = String(body.referral_code || "").trim() || null;
    const referralInput = String(body.referral_id || body.ref || "").trim();
    const apiKey = String(body.api_key || "").trim();
    const userId = String(body.user_id || "").trim() || null;

    if (!tid) {
      return jsonResponse({ error: "Missing tid" }, 400);
    }

    let campaignId = String(body.campaign_id || "").trim() || null;
    let advertiserId = String(body.advertiser_id || "").trim() || null;

    if (apiKey) {
      const { data: keyData } = await supabase
        .from("api_keys")
        .select("campaign_id, campaigns(advertiser_id)")
        .eq("key", apiKey)
        .maybeSingle();

      if (keyData?.campaign_id) {
        campaignId = keyData.campaign_id;
        advertiserId = (keyData.campaigns as { advertiser_id?: string } | null)?.advertiser_id || advertiserId;
      }
    }

    let resolvedReferralId: string | null = null;
    if (campaignId && (referralInput || referralCode)) {
      const lookupValue = referralInput || referralCode || "";
      const { data: referral } = await supabase
        .from("referrals")
        .select("id, code, campaign_id")
        .eq(isUuid(lookupValue) ? "id" : "code", lookupValue)
        .eq("campaign_id", campaignId)
        .maybeSingle();

      if (referral) {
        resolvedReferralId = referral.id;
      }
    }

    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from("tracking_sessions")
      .select("id")
      .eq("tid", tid)
      .maybeSingle();

    const writePayload = {
      tid,
      referral_code: referralCode,
      referral_id: resolvedReferralId,
      campaign_id: campaignId,
      advertiser_id: advertiserId,
      last_seen_at: now,
      metadata: {
        user_agent: req.headers.get("user-agent") || null,
        source: "tracker",
      },
    };

    if (existing?.id) {
      await supabase
        .from("tracking_sessions")
        .update(writePayload)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("tracking_sessions")
        .insert({
          ...writePayload,
          first_seen_at: now,
        });
    }

    // Identity stitching: if user_id provided, link client_id → user_id in users_tracking
    if (userId && campaignId) {
      const { data: existingUser } = await supabase
        .from("users_tracking")
        .select("id, referral_id")
        .eq("campaign_id", campaignId)
        .eq("external_user_id", userId)
        .maybeSingle();

      if (!existingUser) {
        await supabase.from("users_tracking").insert({
          campaign_id: campaignId,
          external_user_id: userId,
          tid,
          referral_id: resolvedReferralId,
          referred_by: referralCode,
        });
      } else if (!existingUser.referral_id && resolvedReferralId) {
        await supabase
          .from("users_tracking")
          .update({ referral_id: resolvedReferralId, tid, referred_by: referralCode })
          .eq("id", existingUser.id);
      }
    }

    return jsonResponse({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
