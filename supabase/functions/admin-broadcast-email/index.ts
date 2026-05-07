import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Karbali Ads <noreply@karbali.com>";

const wrap = (heading: string, bodyHtml: string) => `
<!doctype html><html><body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
    <div style="font-size:18px;font-weight:bold;color:#10b981;margin-bottom:24px;">Karbali Ads</div>
    <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">${heading}</h1>
    <div style="font-size:14px;color:#475569;line-height:1.6;">${bodyHtml}</div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px;">
    <p style="font-size:12px;color:#94a3b8;margin:0;">Karbali Ads — Performance attribution platform</p>
  </div>
</body></html>`;

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { skipped: true };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) return { error: await res.text() };
  return await res.json();
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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
    const { data: { user } } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Invalid token" }, 401);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles || []).some((r) => r.role === "admin")) return json({ error: "Admin only" }, 403);

    const body = await req.json();
    const subject: string = (body.subject || "").toString().trim();
    const message: string = (body.message || "").toString().trim();
    const heading: string = (body.heading || subject).toString().trim();
    const all: boolean = !!body.all;
    const recipientIds: string[] = Array.isArray(body.recipient_ids) ? body.recipient_ids : [];

    if (!subject || !message) return json({ error: "Subject and message are required" }, 400);
    if (subject.length > 200) return json({ error: "Subject too long" }, 400);
    if (message.length > 10000) return json({ error: "Message too long" }, 400);

    let query = admin.from("profiles").select("id, email, full_name").not("email", "is", null);
    if (!all) {
      if (recipientIds.length === 0) return json({ error: "No recipients selected" }, 400);
      query = query.in("id", recipientIds);
    }
    const { data: profiles, error: pErr } = await query;
    if (pErr) return json({ error: pErr.message }, 500);

    const interpolate = (tpl: string, vars: Record<string, string>) =>
      tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");

    let sent = 0, failed = 0;
    const fullProfiles = await admin
      .from("profiles")
      .select("id, email, full_name, company_name")
      .in("id", (profiles || []).map((p: any) => p.id));
    const profileMap = new Map((fullProfiles.data || []).map((p: any) => [p.id, p]));

    for (const p of profiles || []) {
      if (!p.email) continue;
      const fp: any = profileMap.get(p.id) || p;
      const vars = {
        full_name: fp.full_name || "there",
        email: fp.email || "",
        company_name: fp.company_name || "",
      };
      const personalizedSubject = interpolate(subject, vars);
      const personalizedMessage = interpolate(message, vars);
      const personalizedHeading = interpolate(heading, vars);
      const safeMessage = escapeHtml(personalizedMessage).replace(/\n/g, "<br/>");
      const html = wrap(escapeHtml(personalizedHeading), `<p>${safeMessage}</p>`);
      const r = await sendEmail(p.email, personalizedSubject, html);
      if ((r as any).error) failed++; else sent++;
    }

    return json({ ok: true, sent, failed, total: (profiles || []).length });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
});
