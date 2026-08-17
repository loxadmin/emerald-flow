// Public: redeem a one-time affiliate setup code and set a password
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim().toUpperCase();
    const password = String(body.password || "");

    if (!email || !email.includes("@")) return json({ error: "Enter a valid email address" });
    if (!code) return json({ error: "Enter the setup code from your email" });
    if (password.length < 8 || password.length > 72) {
      return json({ error: "Password must be at least 8 characters" });
    }

    const { data: aff } = await admin
      .from("affiliates")
      .select("id, user_id, setup_code, setup_code_expires_at, setup_code_used_at")
      .eq("email", email)
      .maybeSingle();

    if (!aff || !aff.setup_code || aff.setup_code !== code) {
      return json({ error: "That code is invalid for this email" });
    }
    if (aff.setup_code_used_at) return json({ error: "That code has already been used" });
    if (aff.setup_code_expires_at && new Date(aff.setup_code_expires_at).getTime() < Date.now()) {
      return json({ error: "That code has expired, ask an admin to resend it" });
    }

    const { error: pwErr } = await admin.auth.admin.updateUserById(aff.user_id, {
      password,
      email_confirm: true,
    });
    if (pwErr) {
      console.error("password update", pwErr);
      return json({ error: "Oops! Something went wrong!" });
    }

    await admin
      .from("affiliates")
      .update({ setup_code: null, setup_code_used_at: new Date().toISOString() })
      .eq("id", aff.id);

    return json({ ok: true });
  } catch (e) {
    console.error("affiliate-setup", e);
    return json({ error: "Oops! Something went wrong!" });
  }
});
