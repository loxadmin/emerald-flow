// Second daily reminder: marketer-style, category-tailored pitch to advertisers
// whose wallets are still inactive. Runs in addition to send-activation-reminders.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM = "Karbali Ads <noreply@advertiser.karbali.com>";
const APP_URL = "https://advertiser.karbali.com";
const CHANNEL = "marketing"; // distinguishes from the standard reminder in the log

type Subtype =
  | "musician" | "youtuber" | "app" | "website"
  | "ecommerce" | "service" | "real_estate" | null;

function copyFor(subtype: Subtype, name: string) {
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hi there,";
  const map: Record<string, { headline: string; body: string; cta: string }> = {
    musician: {
      headline: "Get up to 25,000 real streams on your next song",
      body: "Activate your Karbali Ads wallet and we will push your music to thousands of real listeners who get rewarded for streaming, sharing and following you. You only get charged after a fan actually engages with your song, so every naira goes into growing your fanbase.",
      cta: "Activate and get 25,000 streams",
    },
    youtuber: {
      headline: "Get up to 25,000 real views on your next YouTube video",
      body: "Activate your Karbali Ads wallet today and put your videos in front of thousands of real viewers. You only get charged when someone actually watches, subscribes or engages, so no wasted spend, no bots, just real growth for your channel.",
      cta: "Activate and get 25,000 views",
    },
    app: {
      headline: "Get up to 20,000 real installs for your app",
      body: "Activate your Karbali Ads wallet and start driving real, attributable installs. You only get charged after a user installs, signs up or completes the action you care about, never just for an impression. Track every event live from your dashboard.",
      cta: "Activate and get 20,000 installs",
    },
    website: {
      headline: "Get up to 20,000 real signups on your website",
      body: "Activate your Karbali Ads wallet and we will send real, intent-driven traffic to your site. You only pay when a visitor actually signs up or completes a conversion you defined, every charge tied to a real, verifiable result.",
      cta: "Activate and get 20,000 signups",
    },
    ecommerce: {
      headline: "Get up to 15,000 paying customers to your store",
      body: "Activate your Karbali Ads wallet and start reaching shoppers ready to buy. With Karbali Commerce you only pay a small flat fee plus commission after a real sale happens, no upfront waste, no paying for clicks that never convert.",
      cta: "Activate and get paying customers",
    },
    service: {
      headline: "Get up to 10,000 paying clients booking your service",
      body: "Activate your Karbali Ads wallet and we will connect you with people actively looking for your service. You only get charged after a real client books or pays, so your ad budget always turns into actual revenue.",
      cta: "Activate and get paying clients",
    },
    real_estate: {
      headline: "Get up to 10,000 serious buyers and renters on your listings",
      body: "Activate your Karbali Ads wallet and put your properties in front of thousands of qualified buyers and renters. You only pay when a real prospect enquires or schedules a viewing, never for empty clicks.",
      cta: "Activate and get property leads",
    },
  };
  const fallback = {
    headline: "Activate your Karbali Ads account and only pay for real results",
    body: "Your Karbali Ads account is ready. Activate your wallet today to launch your first campaign. You only get charged after a real user engages, signs up or buys, so no wasted spend, just measurable growth for your business.",
    cta: "Activate my account",
  };
  const c = (subtype && map[subtype]) || fallback;
  return { greeting, ...c };
}

function html(name: string, subtype: Subtype) {
  const c = copyFor(subtype, name);
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:14px;color:#10b981;font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin-bottom:12px">Karbali Ads</div>
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px;color:#0f172a">${c.headline}</h1>
    <p style="font-size:14px;line-height:1.6;color:#334155;margin:0 0 12px">${c.greeting}</p>
    <p style="font-size:14px;line-height:1.6;color:#334155;margin:0 0 24px">${c.body}</p>
    <a href="${APP_URL}/wallet" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px">${c.cta}</a>
    <p style="font-size:12px;line-height:1.6;color:#64748b;margin:32px 0 0">You are receiving this because your Karbali Ads wallet is not yet activated. These reminders stop automatically once your wallet is active.</p>
    <p style="font-size:12px;color:#94a3b8;margin:24px 0 0">Karbali Ads &middot; <a href="${APP_URL}" style="color:#94a3b8">advertiser.karbali.com</a></p>
  </div></body></html>`;
}

async function sendEmail(to: string, subject: string, body: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html: body }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const today = new Date().toISOString().slice(0, 10);

  const { data: wallets, error: wErr } = await sb
    .from("wallets").select("advertiser_id").eq("is_activated", false);
  if (wErr) return new Response(JSON.stringify({ error: wErr.message }), { status: 500, headers: corsHeaders });

  const ids = (wallets ?? []).map((w: any) => w.advertiser_id);
  if (ids.length === 0) return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const [{ data: profiles }, { data: cats }, { data: alreadySent }] = await Promise.all([
    sb.from("profiles").select("id, email, full_name, is_blocked").in("id", ids),
    sb.from("advertiser_categories").select("advertiser_id, advertiser_subtype").in("advertiser_id", ids),
    sb.from("activation_reminder_log")
      .select("advertiser_id")
      .eq("sent_on", today)
      .eq("status", "sent")
      .like("subtype", `${CHANNEL}:%`)
      .in("advertiser_id", ids),
  ]);

  const sentToday = new Set((alreadySent ?? []).map((r: any) => r.advertiser_id));
  const catMap = new Map((cats ?? []).map((c: any) => [c.advertiser_id, c]));

  let sent = 0, skipped = 0, failed = 0;
  for (const p of (profiles ?? []) as any[]) {
    if (!p.email || p.is_blocked || sentToday.has(p.id)) { skipped++; continue; }
    const subtype: Subtype = (catMap.get(p.id) as any)?.advertiser_subtype ?? null;
    const c = copyFor(subtype, p.full_name ?? "");
    const tag = `${CHANNEL}:${subtype ?? "generic"}`;
    try {
      await sendEmail(p.email, c.headline, html(p.full_name ?? "", subtype));
      await sb.from("activation_reminder_log").upsert(
        { advertiser_id: p.id, email: p.email, subtype: tag, status: "sent", error: null, sent_on: today },
        { onConflict: "advertiser_id,sent_on" }
      );
      sent++;
    } catch (e: any) {
      failed++;
      await sb.from("activation_reminder_log").upsert(
        { advertiser_id: p.id, email: p.email, subtype: tag, status: "failed", error: String(e?.message ?? e), sent_on: today },
        { onConflict: "advertiser_id,sent_on" }
      );
    }
  }

  return new Response(JSON.stringify({ sent, skipped, failed, total: profiles?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
