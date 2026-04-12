import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const eventType = String(body.event_type || body.event || "").trim();
    const suppliedTid = String(body.client_id || body.tid || "").trim();
    const userId = String(body.user_id || "").trim();
    const amount = body.amount != null ? Number(body.amount) : null;

    if (!apiKey || !eventType) {
      return json({ error: "Missing api_key and event_type" }, 400);
    }

    if (!suppliedTid && !userId) {
      return json({ error: "Missing tid/client_id or user_id" }, 400);
    }

    const validEvents = ["signup", "purchase", "download"];
    if (!validEvents.includes(eventType)) {
      return json({ error: "Invalid event_type. Must be: signup, purchase, or download" }, 400);
    }

    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("campaign_id")
      .eq("key", apiKey)
      .single();

    if (keyError || !keyData) {
      return json({ error: "Invalid API key" }, 401);
    }

    const campaignId = keyData.campaign_id;

    let trackingSession:
      | { tid: string; referral_id: string | null; referral_code: string | null }
      | null = null;

    // If user already exists in users_tracking, pull canonical tid from there (cross-device continuity)
    if (userId) {
      const { data: trackedUser } = await supabase
        .from("users_tracking")
        .select("tid, referral_id, referred_by")
        .eq("campaign_id", campaignId)
        .eq("external_user_id", userId)
        .maybeSingle();

      if (trackedUser?.tid) {
        trackingSession = {
          tid: trackedUser.tid,
          referral_id: trackedUser.referral_id,
          referral_code: trackedUser.referred_by,
        };
      }
    }

    const tid = trackingSession?.tid || suppliedTid;

    if (!trackingSession && tid) {
      const { data: session } = await supabase
        .from("tracking_sessions")
        .select("tid, referral_id, referral_code")
        .eq("campaign_id", campaignId)
        .eq("tid", tid)
        .maybeSingle();

      if (session) trackingSession = session;
    }

    // Persist identity continuity (bind user -> tid + referred_by)
    if (userId) {
      const { data: existingUserRow } = await supabase
        .from("users_tracking")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("external_user_id", userId)
        .maybeSingle();

      const userTrackingPayload = {
        campaign_id: campaignId,
        external_user_id: userId,
        tid: tid || null,
        referral_id: trackingSession?.referral_id || null,
        referred_by: trackingSession?.referral_code || null,
      };

      if (existingUserRow?.id) {
        await supabase.from("users_tracking").update(userTrackingPayload).eq("id", existingUserRow.id);
      } else {
        await supabase.from("users_tracking").insert(userTrackingPayload);
      }
    }

    if (tid) {
      const { data: existingTidRow } = await supabase
        .from("users_tracking")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("external_user_id", tid)
        .maybeSingle();

      const tidPayload = {
        campaign_id: campaignId,
        external_user_id: tid,
        tid,
        referral_id: trackingSession?.referral_id || null,
        referred_by: trackingSession?.referral_code || null,
      };

      if (existingTidRow?.id) {
        await supabase.from("users_tracking").update(tidPayload).eq("id", existingTidRow.id);
      } else {
        await supabase.from("users_tracking").insert(tidPayload);
      }
    }

    const trackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/track`;
    const trackResponse = await fetch(trackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        api_key: apiKey,
        event_type: eventType,
        user_id: userId || null,
        client_id: tid || null,
        referral_id: trackingSession?.referral_id || body.referral_id || null,
        amount,
        source_url: body.source_url || "server-side",
      }),
    });

    const result = await trackResponse.json().catch(() => ({}));
    if (result && typeof result === "object") {
      delete (result as Record<string, unknown>).identity;
      delete (result as Record<string, unknown>).linked_identities;
    }

    return json(result, trackResponse.status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
