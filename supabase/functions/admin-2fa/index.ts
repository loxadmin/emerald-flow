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

async function sha256Hex(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function genCode() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

async function sendEmailViaResend(to: string, code: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("[admin-2fa] RESEND_API_KEY not set — skipping email send. Code:", code);
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }
  const from = Deno.env.get("RESEND_FROM") || "Karbali Ads <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Your Karbali Ads admin code: ${code}`,
      html: `<div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#ffffff;color:#0f172a">
        <h2 style="margin:0 0 12px 0;font-size:18px">Admin sign-in code</h2>
        <p style="margin:0 0 12px 0;font-size:14px;color:#475569">Use this code to finish signing in to Karbali Ads admin. It expires in 10 minutes.</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 0;color:#059669;text-align:center">${code}</div>
        <p style="margin:16px 0 0 0;font-size:12px;color:#94a3b8">If you did not try to sign in, you can safely ignore this email.</p>
      </div>`,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("[admin-2fa] resend send failed:", res.status, t);
    return { sent: false, error: `Resend ${res.status}: ${t}` };
  }
  return { sent: true };
}

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

    // Must be admin
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles || []).some((r) => r.role === "admin")) {
      return json({ error: "Admin only" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as "send" | "verify" | undefined;

    if (action === "send") {
      const code = genCode();
      const code_hash = await sha256Hex(code);
      const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Invalidate any prior unconsumed codes
      await admin.from("admin_2fa_codes")
        .update({ consumed_at: new Date().toISOString() })
        .is("consumed_at", null)
        .eq("user_id", user.id);

      const { error: insErr } = await admin.from("admin_2fa_codes").insert({
        user_id: user.id, code_hash, expires_at,
      });
      if (insErr) return json({ error: insErr.message }, 500);

      const result = await sendEmailViaResend(user.email!, code);
      return json({ success: true, email_sent: result.sent, email_error: result.sent ? undefined : result.error });
    }

    if (action === "verify") {
      const code = String(body?.code || "").trim();
      if (!/^\d{6}$/.test(code)) return json({ error: "Invalid code format" }, 400);
      const code_hash = await sha256Hex(code);

      const { data: row } = await admin
        .from("admin_2fa_codes")
        .select("id, expires_at, consumed_at")
        .eq("user_id", user.id)
        .eq("code_hash", code_hash)
        .is("consumed_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (!row) return json({ error: "Invalid or expired code" }, 400);

      await admin
        .from("admin_2fa_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", row.id);

      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
});
