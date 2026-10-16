// Admin-only: invite a new affiliate by email with a one-time setup code
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Karbali Ads <noreply@karbali.com>";
const APP_URL = "https://karbali.com";

const randomCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
};

const affiliateCode = (name: string) => {
  const base = (name || "aff").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() || "AFF";
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
};

async function sendInvite(to: string, name: string, code: string) {
  if (!RESEND_API_KEY) { console.warn("RESEND_API_KEY missing; skipping invite email"); return; }
  const html = `
<!doctype html><html><body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
    <div style="font-size:18px;font-weight:bold;color:#10b981;margin-bottom:24px;">Karbali Ads</div>
    <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">You have been added as an affiliate</h1>
    <div style="font-size:14px;color:#475569;line-height:1.6;">
      <p>Hi ${name || "there"},</p>
      <p>Use the one-time code below to set your password and open your affiliate dashboard. The code works once and expires in 7 days.</p>
      <p style="font-size:28px;letter-spacing:6px;font-weight:bold;color:#0f172a;margin:24px 0;">${code}</p>
      <p>Sign in email: <strong>${to}</strong></p>
    </div>
    <p style="margin:28px 0 0;"><a href="${APP_URL}/affiliate/setup" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">Set my password</a></p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px;">
    <p style="font-size:12px;color:#94a3b8;margin:0;">Karbali Ads — Affiliate programme</p>
  </div>
</body></html>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject: "Your Karbali affiliate setup code", html }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (!token) return json({ error: "Not authorized" }, 401);

    const anonClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    const caller = userData?.user;
    if (userError || !caller) return json({ error: "Not authorized" }, 401);

    const { data: roles } = await admin
      .from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = (roles || []).some((r) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "invite");
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@") || email.length > 255) return json({ error: "Enter a valid email address" }, 400);
    const fullName = String(body.full_name || "").trim().slice(0, 120);

    const code = randomCode();
    const expires = new Date(Date.now() + 7 * 86400000).toISOString();

    if (action === "resend") {
      const { data: existingAff } = await admin
        .from("affiliates").select("id, full_name").ilike("email", email).maybeSingle();
      if (!existingAff) return json({ error: "No affiliate account found with that email" }, 404);
      const { error: upErr } = await admin.from("affiliates")
        .update({ setup_code: code, setup_code_expires_at: expires, setup_code_used_at: null })
        .eq("id", existingAff.id);
      if (upErr) return json({ error: "Could not refresh setup code" }, 500);
      await sendInvite(email, existingAff.full_name || fullName, code);
      return json({ ok: true, resent: true });
    }

    // find or create user first to check if already an affiliate by user_id or email
    let userId = "";
    const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
    if (profile) {
      userId = profile.id;
    } else {
      // Check auth.users list in case profile row is missing or not created yet
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existingUser = list?.users?.find((u) => u.email?.toLowerCase() === email);
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password: crypto.randomUUID() + "aA1!",
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (createErr || !created?.user) {
          console.error("createUser error", createErr);
          return json({ error: createErr?.message || "Could not create user account for affiliate" }, 400);
        }
        userId = created.user.id;
      }
    }

    // Ensure profile row exists
    await admin.from("profiles").upsert(
      { id: userId, email, full_name: fullName || null },
      { onConflict: "id", ignoreDuplicates: true }
    );

    // Ensure user role exists
    await admin.from("user_roles").upsert(
      { user_id: userId, role: "user" },
      { onConflict: "user_id,role", ignoreDuplicates: true }
    );

    // Check if an affiliate row already exists for this email or user_id
    const { data: existingAff } = await admin
      .from("affiliates")
      .select("id")
      .or(`email.ilike.${email},user_id.eq.${userId}`)
      .maybeSingle();

    if (existingAff) {
      return json({ error: "An affiliate account with this email already exists" }, 400);
    }

    // Generate unique affiliate code
    let affCode = affiliateCode(fullName || email.split("@")[0]);
    for (let i = 0; i < 5; i++) {
      const { data: dupCode } = await admin.from("affiliates").select("id").eq("code", affCode).maybeSingle();
      if (!dupCode) break;
      affCode = affiliateCode(fullName || email.split("@")[0]);
    }

    const { error: insErr } = await admin.from("affiliates").insert({
      user_id: userId,
      email,
      full_name: fullName,
      code: affCode,
      setup_code: code,
      setup_code_expires_at: expires,
      invited_by: caller.id,
    });

    if (insErr) {
      console.error("affiliate insert error:", insErr);
      return json({ error: insErr.message || "Could not create affiliate record" }, 500);
    }

    await sendInvite(email, fullName, code);
    return json({ ok: true, user_id: userId });
  } catch (e) {
    console.error("affiliate-invite exception:", e);
    const msg = e instanceof Error ? e.message : "Internal server error";
    return json({ error: msg }, 500);
  }
});
