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

const normalizeVersion = (input: string) => {
  const raw = String(input || "").trim();
  if (!raw) return "";
  return raw.startsWith("v") ? raw : `v${raw}`;
};

const buildSnippet = (apiKey: string, campaignId: string) => `<script>\n  window.KarbaliConfig = { apiKey: "${apiKey}", campaignId: "${campaignId}" };\n</script>\n<script async src="https://advertiser.karbali.com/karbali-tracker/c/${campaignId}.js"></script>`;

const parseCampaignId = (pathname: string) => {
  const match = pathname.match(/\/api\/campaign\/([a-z0-9-]+)\/tracker\//i);
  return match?.[1] || null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) return json({ error: "Invalid token" }, 401);

    const supabase = createClient(supabaseUrl, serviceKey);
    const pathname = new URL(req.url).pathname;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleData;

    // POST /api/tracker/release
    if (pathname.endsWith("/api/tracker/release") && req.method === "POST") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      const body = await req.json();
      const version = normalizeVersion(body.version || "");
      const bundlePath = String(body.bundle_path || "").trim();
      if (!version || !bundlePath) return json({ error: "version and bundle_path are required" }, 400);

      const { data: inserted, error } = await supabase
        .from("tracker_releases")
        .insert({
          version,
          bundle_path: bundlePath,
          changelog: body.changelog || null,
          is_stable: !!body.is_stable,
          release_policy: body.release_policy || "recommended",
          force_upgrade: !!body.force_upgrade,
        })
        .select("*")
        .single();

      if (error) return json({ error: error.message }, 400);
      return json({ success: true, release: inserted });
    }

    const campaignId = parseCampaignId(pathname);
    if (!campaignId) {
      return json({ error: "Unknown tracker endpoint" }, 404);
    }

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, advertiser_id")
      .eq("id", campaignId)
      .maybeSingle();

    if (!campaign || (!isAdmin && campaign.advertiser_id !== user.id)) {
      return json({ error: "Campaign not found" }, 404);
    }

    const { data: latestStable } = await supabase
      .from("tracker_releases")
      .select("id, version, release_policy, force_upgrade")
      .eq("is_stable", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: apiKeyData } = await supabase
      .from("api_keys")
      .select("key")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: install } = await supabase
      .from("campaign_tracker_installs")
      .select("id, status, api_key_snapshot, snippet, installed_at, release:tracker_releases!campaign_tracker_installs_release_id_fkey(version)")
      .eq("campaign_id", campaignId)
      .maybeSingle();

    const currentVersion = (install?.release as { version?: string } | null)?.version || "v1.0.0";
    const stableVersion = latestStable?.version || currentVersion;
    const hasUpgrade = currentVersion !== stableVersion;
    if (hasUpgrade && latestStable?.release_policy === "critical") {
      await supabase
        .from("campaign_tracker_installs")
        .update({ status: "pending_upgrade", updated_at: new Date().toISOString() })
        .eq("campaign_id", campaignId);

      const { data: existingCriticalNotice } = await supabase
        .from("campaign_upgrade_notices")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("to_version", stableVersion)
        .eq("severity", "critical")
        .eq("acknowledged", false)
        .maybeSingle();

      if (!existingCriticalNotice) {
        await supabase.from("campaign_upgrade_notices").insert({
          campaign_id: campaignId,
          from_version: currentVersion,
          to_version: stableVersion,
          severity: "critical",
          message: `Critical tracker release ${stableVersion} is available. Regenerate and redeploy immediately.`,
        });
      }
    }

    // GET /api/campaign/:id/tracker/status
    if (pathname.endsWith("/status") && req.method === "GET") {
      const { data: latestNotice } = await supabase
        .from("campaign_upgrade_notices")
        .select("id, severity, message, acknowledged, to_version")
        .eq("campaign_id", campaignId)
        .eq("acknowledged", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const badge = latestNotice?.severity === "critical"
        ? "critical update"
        : hasUpgrade
          ? "update available"
          : "up-to-date";

      return json({
        campaign_id: campaignId,
        current_version: currentVersion,
        latest_stable_version: stableVersion,
        install_status: install?.status || "active",
        upgrade_badge: badge,
        latest_notice: latestNotice || null,
      });
    }

    // GET /api/campaign/:id/tracker/snippet
    if (pathname.endsWith("/snippet") && req.method === "GET") {
      const key = apiKeyData?.key || install?.api_key_snapshot || "";
      const snippet = install?.snippet || buildSnippet(key, campaignId);
      const pinnedSnippet = latestStable
        ? `<script>\n  window.KarbaliConfig = { apiKey: "${key}", campaignId: "${campaignId}" };\n</script>\n<script async src="https://advertiser.karbali.com/karbali-tracker/v/${latestStable.version}.js"></script>`
        : null;

      return json({
        campaign_id: campaignId,
        version: currentVersion,
        snippet,
        pinned_version_snippet: pinnedSnippet,
      });
    }

    // POST /api/campaign/:id/tracker/regenerate
    if (pathname.endsWith("/regenerate") && req.method === "POST") {
      if (!latestStable) return json({ error: "No stable tracker release found" }, 400);
      const key = apiKeyData?.key || install?.api_key_snapshot;
      if (!key) return json({ error: "No API key found for campaign" }, 400);

      const newSnippet = buildSnippet(key, campaignId);

      if (install?.id) {
        await supabase
          .from("campaign_tracker_installs")
          .update({
            release_id: latestStable.id,
            tracker_release_id: latestStable.id,
            api_key_snapshot: key,
            snippet: newSnippet,
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", install.id);
      } else {
        await supabase
          .from("campaign_tracker_installs")
          .insert({
            campaign_id: campaignId,
            release_id: latestStable.id,
            tracker_release_id: latestStable.id,
            api_key_snapshot: key,
            snippet: newSnippet,
            status: "active",
            installed_at: new Date().toISOString(),
          });
      }

      const previousVersion = currentVersion;
      if (previousVersion !== latestStable.version) {
        await supabase.from("campaign_upgrade_notices").insert({
          campaign_id: campaignId,
          from_version: previousVersion,
          to_version: latestStable.version,
          severity: "info",
          message: `Tracker regenerated from ${previousVersion} to ${latestStable.version}`,
          acknowledged: true,
        });
      }

      return json({
        success: true,
        campaign_id: campaignId,
        from_version: previousVersion,
        to_version: latestStable.version,
        snippet: newSnippet,
        diff_notice: `Updated script endpoint to campaign pointer and release ${latestStable.version}. Old snippets remain valid for grace-period compatibility.`,
      });
    }

    // POST /api/campaign/:id/tracker/acknowledge-upgrade
    if (pathname.endsWith("/acknowledge-upgrade") && req.method === "POST") {
      await supabase
        .from("campaign_upgrade_notices")
        .update({ acknowledged: true })
        .eq("campaign_id", campaignId)
        .eq("acknowledged", false);

      return json({ success: true });
    }

    return json({ error: "Method not supported" }, 405);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
