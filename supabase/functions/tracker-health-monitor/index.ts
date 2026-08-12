import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireInternalOrUser, AuthError } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const STALE_MINUTES = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await requireInternalOrUser(req, { requireAdmin: true });
  } catch (e) {
    return json({ error: (e as Error).message }, (e as AuthError).status || 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const cutoff = new Date(now.getTime() - STALE_MINUTES * 60 * 1000).toISOString();

    const { data: staleRows, error: staleError } = await supabase
      .from("campaign_script_health")
      .select("campaign_id, status, last_ping_at")
      .not("last_ping_at", "is", null)
      .lt("last_ping_at", cutoff);

    if (staleError) {
      return json({ error: staleError.message }, 500);
    }

    const staleCampaignIds = (staleRows || []).map((row) => row.campaign_id);

    if (staleCampaignIds.length > 0) {
      const flaggedReason = `No tracker heartbeat for more than ${STALE_MINUTES} minutes. Potential script uninstall or tampering.`;
      const flaggedAt = now.toISOString();

      await supabase
        .from("campaign_script_health")
        .update({
          status: "under_review",
          flagged_reason: flaggedReason,
          flagged_at: flaggedAt,
          updated_at: flaggedAt,
        })
        .in("campaign_id", staleCampaignIds);
    }

    return json({
      success: true,
      stale_cutoff: cutoff,
      reviewed_campaigns: staleCampaignIds.length,
      stale_campaign_ids: staleCampaignIds,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
