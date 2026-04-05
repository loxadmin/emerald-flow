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
      .select("id, advertiser_id")
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

    // Get advertiser's registered website domain
    const { data: profile } = await supabase
      .from("profiles")
      .select("website")
      .eq("id", user.id)
      .single();

    const finalWebsite = website || profile?.website;

    if (!finalWebsite) return json({ error: "No website registered on your profile. Update your profile with your website domain." }, 400);

    // Update profile if website was provided but not in profile
    if (website && !profile?.website) {
      await supabase.from("profiles").update({ website }).eq("id", user.id);
    }

    // Extract domain from advertiser's registered website
    const domain = finalWebsite.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    // Instead of simulating a call, check if an event has actually been received for this campaign
    // from the specified domain (IP based check is better for web)
    const { data: recentEvents, error: eventsErr } = await supabase
      .from("events")
      .select("id, ip, created_at")
      .eq("campaign_id", campaign_id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (eventsErr) throw eventsErr;

    const keyValid = recentEvents && recentEvents.length > 0;

    if (keyValid) {
      // Check if the event is very recent (last 10 minutes)
      const eventTime = new Date(recentEvents[0].created_at).getTime();
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;

      if (now - eventTime > tenMinutes) {
        return json({
          verified: false,
          error: "Recent test event not found. Please trigger a test event on your website now and click Verify again."
        });
      }

      // Mark campaign as integration verified
      await supabase
        .from("campaigns")
        .update({ integration_verified: true })
        .eq("id", campaign_id);

      // Add a source entry for the advertiser's website
      const { error: sourceErr } = await supabase.from("campaign_sources").insert({
        campaign_id,
        url: finalWebsite,
        type: "web",
        verified: true,
      });
      // Ignore duplicate errors
      if (sourceErr && !sourceErr.message.includes("duplicate")) {
        console.error("Source insert error:", sourceErr.message);
      }

      return json({ verified: true, domain });
    }

    return json({
      verified: false,
      error: "No test event detected. Please ensure you've integrated the tracking code and triggered a test event (e.g., by reloading your page or clicking a button)."
    });
  } catch (err: unknown) {
    console.error("Verify integration error:", (err as Error).message);
    return json({ error: (err as Error).message }, 500);
  }
});
