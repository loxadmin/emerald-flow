import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEGACY_TRACKER_URL = "https://advertiser.karbali.com/karbali-tracker.js";

const normalizeVersion = (input: string) => {
  const raw = String(input || "").trim();
  if (!raw) return "";
  return raw.startsWith("v") ? raw : `v${raw}`;
};

const resolveBundleUrl = (bundlePath: string) => {
  const raw = String(bundlePath || "").trim();
  if (!raw) return LEGACY_TRACKER_URL;
  if (/^https?:\/\//i.test(raw)) return raw;

  try {
    return new URL(raw, LEGACY_TRACKER_URL).toString();
  } catch {
    return LEGACY_TRACKER_URL;
  }
};

const fetchBundle = async (bundlePath: string) => {
  const bundleUrl = resolveBundleUrl(bundlePath);
  const response = await fetch(bundleUrl, {
    headers: { "User-Agent": "Karbali-Tracker-Server/1.0" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`Could not fetch tracker bundle (${response.status}) from ${bundleUrl}`);
  }
  return await response.text();
};

const getCampaignIdFromPath = (pathname: string) => {
  const match = pathname.match(/\/karbali-tracker\/c\/([a-z0-9-]+)\.js$/i);
  return match?.[1] || "";
};

const getVersionFromPath = (pathname: string) => {
  const match = pathname.match(/\/karbali-tracker\/v\/([^/]+)\.js$/i);
  return match?.[1] || "";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const campaignId = getCampaignIdFromPath(url.pathname);
  const versionInput = getVersionFromPath(url.pathname);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    if (versionInput) {
      const version = normalizeVersion(versionInput);
      const { data: release } = await supabase
        .from("tracker_releases")
        .select("version, bundle_path")
        .eq("version", version)
        .maybeSingle();

      if (!release) {
        return new Response("/* tracker version not found */", { status: 404, headers: corsHeaders });
      }

      const script = await fetchBundle(release.bundle_path || LEGACY_TRACKER_URL);
      return new Response(script, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Karbali-Tracker-Version": release.version,
        },
      });
    }

    if (campaignId) {
      const { data: install } = await supabase
        .from("campaign_tracker_installs")
        .select("campaign_id, release:tracker_releases!campaign_tracker_installs_release_id_fkey(version, bundle_path)")
        .eq("campaign_id", campaignId)
        .maybeSingle();

      const release = (install?.release as unknown as { version: string; bundle_path: string } | null) || null;
      const resolvedVersion = release?.version || "v1.0.0";
      const resolvedBundlePath = release?.bundle_path || LEGACY_TRACKER_URL;
      const script = await fetchBundle(resolvedBundlePath);

      return new Response(script, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=600",
          "X-Karbali-Tracker-Version": resolvedVersion,
          "X-Karbali-Campaign-ID": campaignId,
        },
      });
    }

    return new Response("/* not found */", { status: 404, headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(`/* ${message} */`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/javascript; charset=utf-8" },
    });
  }
});
