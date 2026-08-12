import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { enforceRateLimit, RateLimits } from "../_shared/rate-limit.ts";
import { resolveApiKey } from "../_shared/api-key.ts";

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

  // Abuse protection for this public endpoint. Fails open if the limiter is down.
  const limited = await enforceRateLimit(req, "track-session", RateLimits.tracking);
  if (limited) return limited;

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
      // Cached lookup (60s): static key -> campaign/advertiser mapping.
      const resolvedKey = await resolveApiKey(supabase, apiKey);
      if (resolvedKey.campaignId) {
        campaignId = resolvedKey.campaignId;
        advertiserId = resolvedKey.advertiserId || advertiserId;
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
      .select("id, referral_code, referral_id, campaign_id, advertiser_id, metadata")
      .eq("tid", tid)
      .maybeSingle();

    const mergedMetadata = {
      ...((existing?.metadata as Record<string, unknown> | null) || {}),
      user_agent: req.headers.get("user-agent") || null,
      source: "tracker",
      last_seen_via: "track-session",
    };

    const writePayload = {
      tid,
      // first-touch lock: never wipe an existing referral/campaign with null payloads
      referral_code: existing?.referral_code || referralCode,
      referral_id: existing?.referral_id || resolvedReferralId,
      campaign_id: existing?.campaign_id || campaignId,
      advertiser_id: existing?.advertiser_id || advertiserId,
      last_seen_at: now,
      metadata: mergedMetadata,
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

    const finalReferralId = writePayload.referral_id || null;
    const finalReferralCode = writePayload.referral_code || null;
    const finalCampaignId = writePayload.campaign_id || campaignId;

    const upsertIdentity = async (identity: string) => {
      if (!identity || !finalCampaignId) return;

      const { data: existingTrackedUser } = await supabase
        .from("users_tracking")
        .select("id, referral_id, tid, referred_by")
        .eq("campaign_id", finalCampaignId)
        .eq("external_user_id", identity)
        .maybeSingle();

      const payload = {
        campaign_id: finalCampaignId,
        external_user_id: identity,
        tid,
        referral_id: existingTrackedUser?.referral_id || finalReferralId,
        referred_by: existingTrackedUser?.referred_by || finalReferralCode,
      };

      if (!existingTrackedUser) {
        await supabase.from("users_tracking").insert(payload);
      } else {
        await supabase
          .from("users_tracking")
          .update(payload)
          .eq("id", existingTrackedUser.id);
      }
    };

    // Identity stitching: always keep both user_id and tid bound for cross-device continuity.
    await upsertIdentity(tid);
    if (userId) {
      await upsertIdentity(userId);
    }

    return jsonResponse({ success: true, tid, campaign_id: finalCampaignId, referral_id: finalReferralId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
