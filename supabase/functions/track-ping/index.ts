import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveApiKey } from "../_shared/api-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isMissingRelation = (error: { code?: string; message?: string } | null) =>
  !!error && (
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("could not find the table")
  );

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { api_key, domain, timestamp, campaign_id, tracker_version, script_signature } = await req.json();

    if (!api_key || !domain) {
      return json({ error: "Missing api_key or domain" }, 400);
    }

    // Cached lookup: api_keys by key is the hottest read in the database and
    // the mapping is static for the life of the key (60s TTL).
    const resolvedKey = await resolveApiKey(supabase, api_key);

    if (!resolvedKey.campaignId) {
      return json({ error: "Invalid API key" }, 401);
    }

    const campaignId = resolvedKey.campaignId;
    if (campaign_id && campaign_id !== campaignId) {
      return json({ error: "campaign_id does not match api_key" }, 400);
    }

    const pingAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    const { data: existing, error: existingError } = await supabase
      .from("campaign_script_health")
      .select("campaign_id, last_ping_at, status")
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (existingError && !isMissingRelation(existingError)) {
      return json({ error: existingError.message }, 500);
    }

    const healthTableAvailable = !isMissingRelation(existingError);

    const { data: install } = await supabase
      .from("campaign_tracker_installs")
      .select("id, release:tracker_releases!campaign_tracker_installs_release_id_fkey(version)")
      .eq("campaign_id", campaignId)
      .maybeSingle();

    const installedVersion = (install?.release as unknown as { version?: string } | null)?.version || null;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const stale = !!existing?.last_ping_at && existing.last_ping_at < fiveMinutesAgo;

    let integrity: "unknown" | "ok" | "outdated" | "tampered" = "unknown";
    let integrityMessage: string | null = null;

    if (tracker_version && installedVersion && tracker_version !== installedVersion) {
      integrity = "outdated";
      integrityMessage = `Heartbeat version ${tracker_version} differs from installed ${installedVersion}`;
    } else if (!script_signature) {
      integrity = "unknown";
      integrityMessage = "Missing script signature in heartbeat payload";
    } else {
      const expectedSignature = [campaignId, installedVersion || "legacy", "karbali-tracker"].join(":");
      if (script_signature !== expectedSignature) {
        integrity = "tampered";
        integrityMessage = "Script signature mismatch detected";
      } else {
        integrity = "ok";
      }
    }

    const status = stale ? "under_review" : "healthy";
    const flaggedReason = stale
      ? "Tracker heartbeat recovered after inactivity > 5 minutes. Review possible uninstall/tampering."
      : integrity === "tampered"
        ? integrityMessage
        : null;

    if (healthTableAvailable) {
      const { error: upsertError } = await supabase
        .from("campaign_script_health")
        .upsert({
          campaign_id: campaignId,
          campaign_tracker_install_id: install?.id || null,
          domain,
          last_ping_at: pingAt,
          status,
          flagged_reason: flaggedReason,
          flagged_at: stale || integrity === "tampered" ? pingAt : null,
          last_tracker_version: tracker_version || installedVersion,
          last_script_signature: script_signature || null,
          install_integrity: integrity,
          integrity_message: integrityMessage,
          updated_at: new Date().toISOString(),
        }, { onConflict: "campaign_id" });

      if (upsertError && !isMissingRelation(upsertError)) {
        return json({ error: upsertError.message }, 500);
      }
    }

    return json({
      ok: true,
      status,
      install_integrity: integrity,
      health_tracking_enabled: healthTableAvailable,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
