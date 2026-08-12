import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { enforceRateLimit, RateLimits } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeDomain = (url: string): string => {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").trim().toLowerCase();
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Abuse protection for this public endpoint. Fails open if the limiter is down.
  const limited = await enforceRateLimit(req, "detect-offer", RateLimits.publicRead);
  if (limited) return limited;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate user token with external user system
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const extUrl = Deno.env.get("EXT_USER_SUPABASE_URL");
    const extKey = Deno.env.get("EXT_USER_SUPABASE_SERVICE_KEY");

    if (!extUrl || !extKey) {
      return json({ error: "External user system not configured" }, 500);
    }

    const extSupabase = createClient(extUrl, extKey);
    const { data: userData, error: userError } = await extSupabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return json({ error: "Invalid or expired token" }, 401);
    }

    const extUserId = userData.user.id;
    const { url } = await req.json();

    if (!url) {
      return json({ error: "Missing url field" }, 400);
    }

    const browsedDomain = normalizeDomain(url);

    // Find active campaigns matching this domain via campaign_sources or advertiser_websites
    const { data: sources } = await supabase
      .from("campaign_sources")
      .select("campaign_id, url")
      .eq("verified", true);

    const matchingCampaignIds = (sources || [])
      .filter((s) => normalizeDomain(s.url) === browsedDomain)
      .map((s) => s.campaign_id);

    if (matchingCampaignIds.length === 0) {
      return json({ offer: null });
    }

    // Get active campaigns with budget
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, name, ad_type, price_download, price_signup, price_purchase, budget_remaining, selected_milestones")
      .in("id", matchingCampaignIds)
      .eq("status", "active")
      .eq("is_draft", false)
      .gt("budget_remaining", 0);

    if (!campaigns || campaigns.length === 0) {
      return json({ offer: null });
    }

    // Check if user already converted on these campaigns
    const { data: existingClicks } = await supabase
      .from("extension_clicks")
      .select("campaign_id")
      .eq("ext_user_id", extUserId)
      .in("campaign_id", campaigns.map((c) => c.id));

    const convertedCampaignIds = new Set((existingClicks || []).map((c) => c.campaign_id));

    // Filter out already-clicked campaigns and pick highest value
    const availableCampaigns = campaigns.filter((c) => !convertedCampaignIds.has(c.id));

    if (availableCampaigns.length === 0) {
      return json({ offer: null });
    }

    // Calculate payout and points for best campaign
    const best = availableCampaigns.reduce((a, b) => {
      const aMax = Math.max(Number(a.price_download || 0), Number(a.price_signup || 0), Number(a.price_purchase || 0));
      const bMax = Math.max(Number(b.price_download || 0), Number(b.price_signup || 0), Number(b.price_purchase || 0));
      return bMax > aMax ? b : a;
    });

    const payoutNaira = Math.max(
      Number(best.price_download || 0),
      Number(best.price_signup || 0),
      Number(best.price_purchase || 0)
    );

    // 1 point = ₦0.15
    const rewardPoints = Math.floor(payoutNaira / 0.15);

    const eventTypes = best.selected_milestones?.length > 0
      ? best.selected_milestones
      : ["signup"];

    return json({
      offer: {
        campaign_id: best.id,
        title: `Earn ${rewardPoints} points - ${best.name}`,
        reward_points: rewardPoints,
        payout_naira: payoutNaira,
        event_types: eventTypes,
        redirect_url: `https://result-link.lovable.app/ext-track?campaign_id=${best.id}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
