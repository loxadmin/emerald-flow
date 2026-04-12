import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, origin, referer, x-karbali-domain",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SALE_FLAT_FEE = 1;
const SALE_COMMISSION_RATE = 0.1;
const VALID_EVENT_TYPES = ["download", "signup", "purchase"] as const;

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const normalizeDomain = (value: string) =>
  value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .trim()
    .toLowerCase();

const extractDomain = (value: string | null) => {
  if (!value) return "";
  try {
    return normalizeDomain(new URL(value).hostname);
  } catch {
    return normalizeDomain(value);
  }
};

const unique = (values: Array<string | null | undefined>) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

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
    const apiKey = String(body.api_key || "").trim();
    const eventType = String(body.event_type || "").trim();
    const userId = String(body.user_id || "").trim();
    const clientId = String(body.client_id || "").trim();
    const sourceUrl = String(body.source_url || "").trim();
    const referralInput = String(body.referral_id || "").trim();
    const amount = body.amount;
    const identityPool = unique([userId, clientId]);

    if (!apiKey || !eventType || identityPool.length === 0) {
      return jsonResponse({ error: "Missing required fields: api_key, event_type, and user_id or client_id" }, 400);
    }

    if (!VALID_EVENT_TYPES.includes(eventType as (typeof VALID_EVENT_TYPES)[number])) {
      return jsonResponse({ error: "Invalid event_type. Must be: download, signup, purchase" }, 400);
    }

    if (eventType === "purchase" && amount !== null && amount !== undefined && Number(amount) < 0) {
      return jsonResponse({ error: "Purchase amount must be zero or greater" }, 400);
    }

    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("campaign_id")
      .eq("key", apiKey)
      .single();

    if (keyError || !keyData) {
      return jsonResponse({ error: "Invalid API key" }, 401);
    }

    const campaignId = keyData.campaign_id;

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return jsonResponse({ error: "Campaign not found" }, 404);
    }

    if (campaign.status !== "active") {
      return jsonResponse({ error: "Campaign is not active" }, 403);
    }

    if (
      Array.isArray(campaign.selected_milestones) &&
      campaign.selected_milestones.length > 0 &&
      !campaign.selected_milestones.includes(eventType)
    ) {
      return jsonResponse({ error: `This campaign is not configured for ${eventType} tracking` }, 403);
    }

    if (campaign.website_id) {
      const { data: website } = await supabase
        .from("advertiser_websites")
        .select("domain")
        .eq("id", campaign.website_id)
        .single();

      if (website?.domain) {
        const requestDomain = extractDomain(
          req.headers.get("x-karbali-domain") ||
            sourceUrl ||
            req.headers.get("origin") ||
            req.headers.get("referer") ||
            ""
        );
        const allowedDomain = normalizeDomain(website.domain);

        if (!requestDomain || requestDomain !== allowedDomain) {
          return jsonResponse({ error: "API key is not authorized for this domain" }, 403);
        }
      }
    }

    let resolvedReferralId: string | null = null;
    if (referralInput) {
      const { data: referral } = await supabase
        .from("referrals")
        .select("id, campaign_id")
        .eq(isUuid(referralInput) ? "id" : "code", referralInput)
        .maybeSingle();

      if (!referral || referral.campaign_id !== campaignId) {
        return jsonResponse({ error: "Referral does not belong to this campaign" }, 400);
      }
      resolvedReferralId = referral.id;
    }

    const identitiesToResolve = [...identityPool];
    const referralFromTracking = new Map<string, string | null>();

    if (identitiesToResolve.length > 0) {
      const { data: trackedUsers } = await supabase
        .from("users_tracking")
        .select("id, external_user_id, referral_id")
        .eq("campaign_id", campaignId)
        .in("external_user_id", identitiesToResolve);

      trackedUsers?.forEach((entry) => {
        referralFromTracking.set(entry.external_user_id, entry.referral_id);
      });
    }

    if (!resolvedReferralId) {
      for (const identity of identitiesToResolve) {
        const referralId = referralFromTracking.get(identity);
        if (referralId) {
          resolvedReferralId = referralId;
          break;
        }
      }
    }

    let referredByCode: string | null = null;
    if (!resolvedReferralId && clientId) {
      const { data: sessionReferral } = await supabase
        .from("tracking_sessions")
        .select("referral_id, referral_code")
        .eq("campaign_id", campaignId)
        .eq("tid", clientId)
        .maybeSingle();

      if (sessionReferral?.referral_id) {
        resolvedReferralId = sessionReferral.referral_id;
      }
      referredByCode = sessionReferral?.referral_code || null;
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentEvents } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("ip", ip)
      .gte("created_at", oneMinuteAgo);

    if ((recentEvents || 0) > 10) {
      return jsonResponse({ error: "Rate limit exceeded" }, 429);
    }

    const duplicateIdentity = userId || clientId;
    const duplicateWindow = new Date(Date.now() - 5000).toISOString();
    const duplicateQuery = supabase
      .from("events")
      .select("external_user_id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("event_type", eventType)
      .gte("created_at", duplicateWindow);

    if (identityPool.length > 1) {
      duplicateQuery.in("external_user_id", identityPool);
    } else {
      duplicateQuery.eq("external_user_id", duplicateIdentity);
    }

    const { count: duplicateCount } = await duplicateQuery;
    if ((duplicateCount || 0) > 0) {
      return jsonResponse({ error: "Duplicate event detected" }, 409);
    }

    for (const identity of identityPool) {
      const { data: existingTrackedUser } = await supabase
        .from("users_tracking")
        .select("id, referral_id")
        .eq("campaign_id", campaignId)
        .eq("external_user_id", identity)
        .maybeSingle();

      if (!existingTrackedUser) {
        await supabase.from("users_tracking").insert({
          external_user_id: identity,
          campaign_id: campaignId,
          referral_id: resolvedReferralId,
          tid: clientId || null,
          referred_by: referredByCode,
        });
      } else if (!existingTrackedUser.referral_id && resolvedReferralId) {
        await supabase
          .from("users_tracking")
          .update({ referral_id: resolvedReferralId, tid: clientId || null, referred_by: referredByCode })
          .eq("id", existingTrackedUser.id);
      }
    }

    const canonicalIdentity = userId || clientId;
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        campaign_id: campaignId,
        external_user_id: canonicalIdentity,
        event_type: eventType,
        amount: amount ?? null,
        referral_id: resolvedReferralId,
        ip,
      })
      .select("id")
      .single();

    if (eventError) throw eventError;

    const { data: userEvents } = await supabase
      .from("events")
      .select("id, event_type")
      .eq("campaign_id", campaignId)
      .in("external_user_id", identityPool);

    let chargeAmount = 0;
    const hasPurchase = userEvents?.some((entry) => entry.event_type === "purchase" && entry.id !== event.id);
    const hasSignup = userEvents?.some((entry) => entry.event_type === "signup" && entry.id !== event.id);

    if (eventType === "purchase") {
      const saleAmount = Number(amount || 0);
      chargeAmount = Number(campaign.price_purchase || SALE_FLAT_FEE) + saleAmount * SALE_COMMISSION_RATE;
    } else if (eventType === "signup" && !hasPurchase) {
      chargeAmount = Number(campaign.price_signup);
    } else if (eventType === "download" && !hasSignup && !hasPurchase) {
      chargeAmount = Number(campaign.price_download);
    }

    if (chargeAmount > 0 && Number(campaign.budget_remaining) < chargeAmount) {
      await supabase.from("campaigns").update({ status: "rejected" }).eq("id", campaignId);
      return jsonResponse({ error: "Campaign budget is exhausted" }, 402);
    }

    if (chargeAmount > 0) {
      await supabase.from("transactions").insert({
        campaign_id: campaignId,
        event_id: event.id,
        amount: chargeAmount,
        description: `${eventType} event charge`,
      });

      const newBudget = Number(campaign.budget_remaining) - chargeAmount;
      const updateData: Record<string, unknown> = { budget_remaining: newBudget };
      if (newBudget <= 0) {
        updateData.status = "rejected";
      }

      await supabase.from("campaigns").update(updateData).eq("id", campaignId);
    }

    return jsonResponse({
      success: true,
      event_id: event.id,
      charged: chargeAmount,
      referral_id: resolvedReferralId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
