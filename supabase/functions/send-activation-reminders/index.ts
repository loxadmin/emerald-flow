// Daily activation reminder emails to advertisers with un-activated wallets.
// Personalised by ad subtype (youtuber, musician, app, website, ecommerce, etc.).
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

type Subtype = "musician" | "youtuber" | "app" | "website" | "ecommerce" | "service" | "real_estate" | null;

function copyFor(subtype: Subtype, type: string | null, name: string) {
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hi there,";
  const map: Record<string, { headline: string; body: string; cta: string }> = {
    youtuber: {
      headline: "Activate your Karbali Ads account to start getting more views on your channel",
      body: "Your YouTube audience is waiting. Activate your account today and start running interactive offerwalls that pay viewers to watch and engage with your videos.",
      cta: "Start getting more views",
    },
    musician: {
      headline: "Activate your account to grow your listeners on Karbali Ads",
      body: "Get real listeners on your tracks. Activate now to launch engagement campaigns that reward fans for streaming your music.",
      cta: "Grow my audience",
    },
    app: {
      headline: "Activate your account to start getting installs for your app",
      body: "Track real downloads, signups and in-app purchases with Karbali Ads. Activate your wallet to launch your first performance campaign.",
      cta: "Get app installs",
    },
    website: {
      headline: "Activate your account to start driving signups to your website",
      body: "Karbali Ads brings real users to your website with full conversion tracking. Activate your wallet to go live.",
      cta: "Start driving signups",
    },
    ecommerce: {
      headline: "Activate your account to start getting paying customers",
      body: "Reach buyers ready to purchase. Activate your Karbali Ads wallet to launch commerce campaigns that pay only for real sales.",
      cta: "Get paying customers",
    },
    service: {
      headline: "Activate your account to start getting paying clients",
      body: "Get qualified leads for your service. Activate your wallet today to launch commerce campaigns and start receiving real clients.",
      cta: "Get paying clients",
    },
    real_estate: {
      headline: "Activate your account to start getting property buyers and renters",
      body: "Reach serious property seekers on Karbali Ads. Activate your wallet to launch listings campaigns that bring real enquiries.",
      cta: "Get property leads",
    },
  };
  const fallback = {
    headline: "Activate your Karbali Ads account to start getting customers",
    body: "Your Karbali Ads account is ready, but your wallet is not yet activated. Fund and activate your wallet to launch your first campaign.",
    cta: "Activate my account",
  };
  const c = (subtype && map[subtype]) || fallback;
  return { greeting, ...c };
}

function html(name: string, subtype: Subtype, type: string | null) {
  const c = copyFor(subtype, type, name);
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:14px;color:#10b981;font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin-bottom:12px">Karbali Ads</div>
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px;color:#0f172a">${c.headline}</h1>
    <p style="font-size:14px;line-height:1.6;color:#334155;margin:0 0 12px">${c.greeting}</p>
    <p style="font-size:14px;line-height:1.6;color:#334155;margin:0 0 24px">${c.body}</p>
    <a href="${APP_URL}/wallet" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px">${c.cta}</a>
    <p style="font-size:12px;line-height:1.6;color:#64748b;margin:32px 0 0">You are receiving this because your Karbali Ads wallet is not yet activated. These reminders stop automatically once your wallet is active.</p>
    <p style="font-size:12px;color:#94a3b8;margin:24px 0 0">Karbali Ads &middot; <a href="${APP_URL}" style="color:#94a3b8">karbaliads.com</a></p>
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

  // Find advertisers with un-activated wallets
  const { data: wallets, error: wErr } = await sb
    .from("wallets")
    .select("advertiser_id")
    .eq("is_activated", false);
  if (wErr) return new Response(JSON.stringify({ error: wErr.message }), { status: 500, headers: corsHeaders });

  const ids = (wallets ?? []).map((w: any) => w.advertiser_id);
  if (ids.length === 0) return new Response(JSON.stringify({ sent: 0, skipped: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const [{ data: profiles }, { data: cats }, { data: alreadySent }] = await Promise.all([
    sb.from("profiles").select("id, email, full_name, is_blocked").in("id", ids),
    sb.from("advertiser_categories").select("advertiser_id, advertiser_type, advertiser_subtype").in("advertiser_id", ids),
    sb
      .from("activation_reminder_log")
      .select("advertiser_id")
      .eq("sent_on", today)
      .eq("status", "sent")
      .in("advertiser_id", ids),
  ]);

  const sentToday = new Set((alreadySent ?? []).map((r: any) => r.advertiser_id));
  const catMap = new Map((cats ?? []).map((c: any) => [c.advertiser_id, c]));

  let sent = 0, skipped = 0, failed = 0;
  for (const p of (profiles ?? []) as any[]) {
    if (!p.email || p.is_blocked || sentToday.has(p.id)) { skipped++; continue; }
    const cat = catMap.get(p.id) as any;
    const subtype: Subtype = cat?.advertiser_subtype ?? null;
    const type: string | null = cat?.advertiser_type ?? null;
    const c = copyFor(subtype, type, p.full_name ?? "");
    try {
      await sendEmail(p.email, c.headline, html(p.full_name ?? "", subtype, type));
      await sb.from("activation_reminder_log").upsert(
        { advertiser_id: p.id, email: p.email, subtype, status: "sent", error: null, sent_on: today },
        { onConflict: "advertiser_id,sent_on" }
      );
      sent++;
    } catch (e: any) {
      failed++;
      await sb.from("activation_reminder_log").upsert(
        { advertiser_id: p.id, email: p.email, subtype, status: "failed", error: String(e?.message ?? e), sent_on: today },
        { onConflict: "advertiser_id,sent_on" }
      );
    }
  }

  return new Response(JSON.stringify({ sent, skipped, failed, total: profiles?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
