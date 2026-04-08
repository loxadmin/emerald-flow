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

const normalizeDomain = (value: string) => value.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim().toLowerCase();

const trackerMarkers = [
  "karbali-tracker.js",
  "window.karbali",
  "window.karbaliads",
  "window.karbaliconfig",
  "window.karbaliadsconfig",
  "karbaliconfig",
  "karbaliadsconfig",
  "data-api-key",
  "karbali.track",
  "karbaliads.track",
];

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Karbali-Ads-Integration-Check/1.0" },
    signal: AbortSignal.timeout(4000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }

  return response.text();
}

function extractScriptUrls(html: string, baseUrl: string) {
  const scriptMatches = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)];
  return scriptMatches
    .map((match) => match[1])
    .map((src) => {
      try {
        return new URL(src, baseUrl).toString();
      } catch {
        return null;
      }
    })
    .filter((url): url is string => !!url)
    .slice(0, 5);
}

function containsTracker(texts: string[], apiKey: string) {
  const normalizedApiKey = apiKey.toLowerCase();
  return texts.some((text) => {
    const normalizedText = text.toLowerCase();
    return normalizedText.includes(normalizedApiKey) && trackerMarkers.some((marker) => normalizedText.includes(marker));
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user with anon client
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) return json({ error: "Invalid token" }, 401);

    const { campaign_id, api_key, website } = await req.json();
    if (!campaign_id || !api_key) return json({ error: "Missing campaign_id or api_key" }, 400);

    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify campaign belongs to this user
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, advertiser_id, website_id")
      .eq("id", campaign_id)
      .eq("advertiser_id", user.id)
      .single();

    if (!campaign) return json({ error: "Campaign not found" }, 404);

    // Verify API key exists for this campaign
    const { data: keyData } = await supabase
      .from("api_keys")
      .select("key")
      .eq("campaign_id", campaign_id)
      .eq("key", api_key)
      .single();

    if (!keyData) return json({ error: "Invalid API key" }, 400);

    const requestedDomain = website ? normalizeDomain(website) : null;
    const websiteQuery = supabase
      .from("advertiser_websites")
      .select("id, domain, is_verified")
      .eq("advertiser_id", user.id)
      .eq("is_verified", true);

    const { data: verifiedWebsites } = campaign.website_id
      ? await websiteQuery.eq("id", campaign.website_id)
      : requestedDomain
        ? await websiteQuery.eq("domain", requestedDomain)
        : await websiteQuery;

    const selectedWebsite = verifiedWebsites?.[0];
    if (!selectedWebsite) {
      return json({ error: "Select a verified advertiser website before verifying integration." }, 400);
    }

    const domain = normalizeDomain(selectedWebsite.domain);
    const candidateUrls = [`https://${domain}`, `http://${domain}`];

    let html = "";
    let checkedUrl = "";
    let lastFetchError = "";

    for (const candidateUrl of candidateUrls) {
      try {
        html = await fetchText(candidateUrl);
        checkedUrl = candidateUrl;
        break;
      } catch (error) {
        lastFetchError = error instanceof Error ? error.message : "Unable to fetch website";
      }
    }

    if (!html || !checkedUrl) {
      return json({ verified: false, error: lastFetchError || "We could not reach the selected website to verify the integration." });
    }

    const textsToScan = [html];
    const scriptUrls = extractScriptUrls(html, checkedUrl);

    for (const scriptUrl of scriptUrls) {
      try {
        textsToScan.push(await fetchText(scriptUrl));
      } catch {
        // Ignore individual script failures and continue scanning what we can fetch.
      }
    }

    if (!containsTracker(textsToScan, api_key)) {
      return json({ verified: false, error: "We couldn't detect the Karbali Ads loader or API key on your selected website yet." });
    }

    await supabase
      .from("campaigns")
      .update({ integration_verified: true })
      .eq("id", campaign_id);

    const { error: sourceErr } = await supabase.from("campaign_sources").insert({
      campaign_id,
      url: checkedUrl,
      type: "web",
      verified: true,
    });

    if (sourceErr && !sourceErr.message.toLowerCase().includes("duplicate")) {
      console.error("Source insert error:", sourceErr.message);
    }

    return json({ verified: true, domain, checked_url: checkedUrl });
  } catch (err: unknown) {
    console.error("Verify integration error:", (err as Error).message);
    return json({ error: (err as Error).message }, 500);
  }
});
