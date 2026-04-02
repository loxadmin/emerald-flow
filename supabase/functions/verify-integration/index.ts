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

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return json({ error: "Invalid token" }, 401);

    const { campaign_id, api_key } = await req.json();
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

    if (!profile?.website) return json({ error: "No website registered on your profile" }, 400);

    // Send a test tracking call to verify the API key works
    const testRes = await fetch(`${supabaseUrl}/functions/v1/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key,
        event_type: "download",
        user_id: `verify_test_${Date.now()}`,
        referral_id: null,
      }),
    });

    const testData = await testRes.json();

    if (testRes.ok && testData.success) {
      // Mark campaign as integration verified
      await supabase
        .from("campaigns")
        .update({ integration_verified: true })
        .eq("id", campaign_id);

      // Add a source entry for the advertiser's website
      const domain = profile.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      await supabase.from("campaign_sources").insert({
        campaign_id,
        url: profile.website,
        type: "web",
        verified: true,
      }).onConflict("campaign_id,url").then(() => {});

      return json({ verified: true, domain });
    }

    return json({ verified: false, error: testData.error || "Test call failed" });
  } catch (err: unknown) {
    console.error("Verify integration error:", (err as Error).message);
    return json({ error: (err as Error).message }, 500);
  }
});
