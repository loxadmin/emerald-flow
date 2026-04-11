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

function getDisplayName(user: Record<string, any>) {
  const meta = user?.user_metadata || {};
  return meta.full_name || meta.name || meta.display_name || meta.username || user?.email || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { data, error } = await extSupabase.auth.getUser(token);

    if (error || !data?.user) {
      return json({ error: "Invalid or expired token" }, 401);
    }

    const user = data.user;

    return json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email ?? null,
        name: getDisplayName(user),
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});