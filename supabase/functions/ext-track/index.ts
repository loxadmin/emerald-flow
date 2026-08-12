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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Abuse protection for this public endpoint. Fails open if the limiter is down.
  const limited = await enforceRateLimit(req, "ext-track", RateLimits.tracking);
  if (limited) return limited;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const extSupabase = createClient(
      Deno.env.get("EXT_USER_SUPABASE_URL")!,
      Deno.env.get("EXT_USER_SUPABASE_SERVICE_KEY")!
    );

    const { data: userData, error: userError } = await extSupabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ error: "Invalid token" }, 401);
    }

    const extUserId = userData.user.id;
    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return json({ error: "Missing campaign_id" }, 400);
    }

    // Fetch campaign
    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .select("id, status, budget_remaining, website_id")
      .eq("id", campaign_id)
      .single();

    if (campError || !campaign) {
      return json({ error: "Campaign not found" }, 404);
    }

    if (campaign.status !== "active" || Number(campaign.budget_remaining) <= 0) {
      return json({ error: "Campaign is not active or budget exhausted" }, 403);
    }

    // Check duplicate click (same user + campaign within 1 hour)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentClicks } = await supabase
      .from("extension_clicks")
      .select("id", { count: "exact", head: true })
      .eq("ext_user_id", extUserId)
      .eq("campaign_id", campaign_id)
      .gte("created_at", oneHourAgo);

    if ((recentClicks || 0) > 0) {
      return json({ error: "Already clicked recently" }, 409);
    }

    // Get destination URL
    const { data: sources } = await supabase
      .from("campaign_sources")
      .select("url")
      .eq("campaign_id", campaign_id)
      .eq("verified", true)
      .limit(1);

    const destinationUrl = sources?.[0]?.url || "";

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Create click record
    const { data: click, error: clickError } = await supabase
      .from("extension_clicks")
      .insert({
        ext_user_id: extUserId,
        campaign_id,
        destination_url: destinationUrl,
        user_agent: userAgent,
        ip,
      })
      .select("id")
      .single();

    if (clickError) throw clickError;

    // Build redirect URL with tracking
    let redirectUrl = destinationUrl;
    if (redirectUrl) {
      try {
        const u = new URL(redirectUrl.startsWith("http") ? redirectUrl : `https://${redirectUrl}`);
        u.searchParams.set("ref", "kabali");
        u.searchParams.set("click_id", click.id);
        redirectUrl = u.toString();
      } catch {
        // Use as-is
      }
    }

    return json({
      success: true,
      click_id: click.id,
      redirect_url: redirectUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
