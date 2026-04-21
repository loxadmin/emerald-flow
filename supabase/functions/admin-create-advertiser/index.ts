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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const { data: { user }, error: authError } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles || []).some((r) => r.role === "admin")) return json({ error: "Admin only" }, 403);

    const body = await req.json();
    const {
      email, full_name, company_name, category_id, advertiser_type, advertiser_subtype,
      websites, // optional [{ domain }]
    } = body || {};

    if (!email || !category_id) {
      return json({ error: "Missing email or category_id" }, 400);
    }

    // Check if user already exists by listing
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let userId = list?.users?.find((u) => u.email?.toLowerCase() === String(email).toLowerCase())?.id;

    if (!userId) {
      // Invite via magic link — sets the session redirect to dashboard
      const redirectTo = (req.headers.get("origin") || "") + "/dashboard";
      const { data: invite, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name, company_name, created_by_admin: true },
      });
      if (invErr || !invite?.user) {
        return json({ error: invErr?.message || "Failed to invite advertiser" }, 400);
      }
      userId = invite.user.id;
    }

    // Ensure profile exists & mark created_by_admin
    await admin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          full_name: full_name || null,
          company_name: company_name || null,
          created_by_admin: true,
        },
        { onConflict: "id" }
      );

    // Ensure user role
    await admin.from("user_roles").upsert(
      { user_id: userId, role: "user" },
      { onConflict: "user_id,role", ignoreDuplicates: true }
    );

    // Create or update advertiser_categories (status = active so they can use the platform immediately)
    const { error: catErr } = await admin
      .from("advertiser_categories")
      .upsert(
        {
          advertiser_id: userId,
          category_id,
          advertiser_type: advertiser_type || null,
          advertiser_subtype: advertiser_subtype || null,
          status: "active",
        },
        { onConflict: "advertiser_id" }
      );
    if (catErr) return json({ error: catErr.message }, 400);

    // Pre-verified websites
    if (Array.isArray(websites)) {
      const rows = websites
        .filter((w: any) => w && typeof w.domain === "string" && w.domain.trim())
        .map((w: any) => ({
          advertiser_id: userId,
          domain: w.domain.trim().toLowerCase(),
          is_verified: true,
        }));
      if (rows.length > 0) {
        await admin.from("advertiser_websites").insert(rows);
      }
    }

    // Make sure a wallet row exists
    await admin.from("wallets").upsert(
      { advertiser_id: userId, balance: 0, currency: "USD", is_activated: false },
      { onConflict: "advertiser_id", ignoreDuplicates: true }
    );

    return json({ success: true, user_id: userId });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
});
